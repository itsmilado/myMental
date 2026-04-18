//src/features/transcription/components/TranscriptText.tsx

import * as React from "react";
import {
    Box,
    Paper,
    Stack,
    Switch,
    FormControlLabel,
    Typography,
} from "@mui/material";

import type {
    NormalizedTranscriptWord,
    TranscriptUtterance,
} from "../../../types/types";

type Block = {
    speaker?: string | null;
    timestampMs?: number | null;
    startMs?: number | null;
    endMs?: number | null;
    lines: string[];
};

type Props = {
    text?: string | null;
    utterances?: TranscriptUtterance[] | null;
    words?: NormalizedTranscriptWord[] | null;
    activeWordIndex?: number;
    activeUtteranceIndex?: number;
    highlightActiveWord?: boolean;
    highlightActiveSpeakerBlock?: boolean;
    defaultShowSpeakers?: boolean;
    defaultShowTimestamps?: boolean;
    maxHeight?: number | string;
    disableInternalScroll?: boolean;
};

/*
- purpose: format millisecond transcript timestamps for the optional transcript header
- inputs: timestamp in milliseconds
- outputs: mm:ss display string
- important behavior: keeps transcript timestamps compact and consistent across views
*/

const formatMs = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/*
- purpose: normalize raw speaker values into a clean label input
- inputs: speaker identifier from transcript text or utterance payloads
- outputs: trimmed speaker string or null
- important behavior: treats empty and missing speaker values as no-speaker state
*/

const normalizeSpeaker = (
    s: string | number | null | undefined,
): string | null => {
    if (s == null) return null;
    const value = String(s).trim();
    return value.length ? value : null;
};

/*
- purpose: convert normalized speaker values into a consistent UI label
- inputs: normalized speaker identifier
- outputs: display-ready speaker label
- important behavior: avoids duplicating the Speaker prefix for already-labeled values
*/

const labelSpeaker = (speaker: string): string => {
    return speaker.startsWith("Speaker") ? speaker : `Speaker ${speaker}`;
};

/*
- purpose: group consecutive utterances into readable speaker blocks
- inputs: normalized utterance array with optional speaker and timing bounds
- outputs: render blocks with grouped text and merged timing ranges
- important behavior: preserves the earliest start and latest end for each merged
  block so active speaker highlighting matches the visible grouped block
*/

const buildBlocksFromUtterances = (
    utterances: TranscriptUtterance[],
): Block[] => {
    const blocks: Block[] = [];

    for (const utterance of utterances) {
        const line = (utterance.text ?? "").trim();

        if (!line) continue;

        const rawSpeaker = normalizeSpeaker(utterance.speaker);
        const speaker = rawSpeaker ? labelSpeaker(rawSpeaker) : null;
        const timestampMs =
            typeof utterance.start === "number" ? utterance.start : null;
        const startMs =
            typeof utterance.start === "number" ? utterance.start : null;
        const endMs = typeof utterance.end === "number" ? utterance.end : null;

        const previousBlock = blocks[blocks.length - 1];
        const sameSpeaker = previousBlock && previousBlock.speaker === speaker;

        if (sameSpeaker) {
            previousBlock.lines.push(line);

            if (previousBlock.startMs == null && startMs != null) {
                previousBlock.startMs = startMs;
            }

            if (endMs != null) {
                previousBlock.endMs = endMs;
            }

            continue;
        }

        blocks.push({
            speaker,
            timestampMs,
            startMs,
            endMs,
            lines: [line],
        });
    }

    return blocks;
};

const SPEAKER_LINE_RE = /^([^\n:]{1,40}):\s*(.+)$/;

const buildBlocksFromSpeakerLabeledText = (text: string): Block[] => {
    const lines = text.split(/\r?\n/);
    const blocks: Block[] = [];

    let current: Block | null = null;

    const flush = () => {
        if (!current) return;
        if (current.lines.length) blocks.push(current);
        current = null;
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            flush();
            continue;
        }

        const match = line.match(SPEAKER_LINE_RE);

        if (match) {
            const label = match[1].trim();
            const body = match[2].trim();

            if (current && current.speaker === label) {
                current.lines.push(body);
            } else {
                flush();
                current = {
                    speaker: label,
                    timestampMs: null,
                    startMs: null,
                    endMs: null,
                    lines: [body],
                };
            }
            continue;
        }

        if (!current) {
            current = {
                speaker: null,
                timestampMs: null,
                startMs: null,
                endMs: null,
                lines: [],
            };
        }
        current.lines.push(line);
    }

    flush();
    return blocks;
};

const buildParagraphBlocks = (text: string): Block[] => {
    return text
        .split(/\n\s*\n/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => ({
            speaker: null,
            timestampMs: null,
            startMs: null,
            endMs: null,
            lines: [paragraph],
        }));
};

/*
- purpose: decide whether a grouped transcript block is currently active
- inputs: one rendered block and the current active utterance playback position
- outputs: true when the active utterance falls within the visible block range
- important behavior: only highlights blocks with reliable timing bounds
*/
const isBlockActive = ({
    block,
    activeUtteranceTimeMs,
    enabled,
}: {
    block: Block;
    activeUtteranceTimeMs: number | null;
    enabled: boolean;
}): boolean => {
    if (!enabled || activeUtteranceTimeMs === null) {
        return false;
    }

    if (block.startMs == null || block.endMs == null) {
        return false;
    }

    return (
        activeUtteranceTimeMs >= block.startMs &&
        activeUtteranceTimeMs <= block.endMs
    );
};

/*
- purpose: select the timed words that belong to one rendered transcript block
- inputs: one grouped transcript block and the full timed word array
- outputs: the subset of timed words that fall inside the block timing range
- important behavior: returns null when the block has no reliable timing bounds so
  non-timed rendering can safely fall back to the original block text
*/
const getBlockWords = ({
    block,
    words,
    blockIndex,
    totalBlocks,
}: {
    block: Block;
    words: NormalizedTranscriptWord[] | null | undefined;
    blockIndex: number;
    totalBlocks: number;
}): NormalizedTranscriptWord[] | null => {
    if (!Array.isArray(words) || words.length === 0) {
        return null;
    }

    if (block.startMs != null && block.endMs != null) {
        const blockWords = words.filter((word) => {
            return word.start >= block.startMs! && word.end <= block.endMs!;
        });

        return blockWords.length > 0 ? blockWords : null;
    }

    /*
    - purpose: keep word highlighting available when transcript blocks do not
      have timing bounds, such as plain-text transcripts without speaker labels
    - inputs: current block index and total rendered block count
    - outputs: full word list for single-block transcripts, otherwise null
    - important behavior: avoids duplicating the full transcript across multiple
      blocks while still enabling highlighting for the common single-block case
    */
    if (totalBlocks === 1 && blockIndex === 0) {
        return words;
    }

    return null;
};

/*
- purpose: render one transcript block with optional timed-word highlighting
- inputs: rendered block, full timed word array, and the active playback word index
- outputs: plain block text or a block-local highlighted word sequence
- important behavior: only renders words that belong to the current block so
  multi-block transcripts do not duplicate the entire transcript in every block
*/

const renderHighlightedBlockText = ({
    block,
    words,
    activeWordIndex,
    enabled,
    blockIndex,
    totalBlocks,
}: {
    block: Block;
    words: NormalizedTranscriptWord[] | null | undefined;
    activeWordIndex: number;
    enabled: boolean;
    blockIndex: number;
    totalBlocks: number;
}) => {
    const fallbackText = block.lines.join("\n");

    if (!enabled) {
        return fallbackText;
    }

    const blockWords = getBlockWords({
        block,
        words,
        blockIndex,
        totalBlocks,
    });
    if (!blockWords) {
        return fallbackText;
    }

    return blockWords.map((word) => {
        const isActiveWord =
            activeWordIndex >= 0 &&
            Array.isArray(words) &&
            words[activeWordIndex]?.start === word.start &&
            words[activeWordIndex]?.end === word.end;

        return (
            <Box
                key={`${word.start}-${word.end}`}
                component="span"
                sx={{
                    px: isActiveWord ? 0.05 : 0,
                    py: isActiveWord ? 0.05 : 0,
                    borderRadius: isActiveWord ? 0.75 : 0,
                    bgcolor: isActiveWord ? "warning.light" : "transparent",
                    fontWeight: isActiveWord ? 500 : 400,
                    transition: "background-color 120ms ease",
                }}
            >
                {word.text}{" "}
            </Box>
        );
    });
};

export const TranscriptText: React.FC<Props> = ({
    text,
    utterances,
    words,
    activeWordIndex = -1,
    activeUtteranceIndex = -1,
    highlightActiveWord = false,
    highlightActiveSpeakerBlock = false,
    defaultShowSpeakers = true,
    defaultShowTimestamps = false,
    maxHeight = 420,
    disableInternalScroll = false,
}) => {
    const [showSpeakers, setShowSpeakers] =
        React.useState<boolean>(defaultShowSpeakers);
    const [showTimestamps, setShowTimestamps] = React.useState<boolean>(
        defaultShowTimestamps,
    );

    const blocks = React.useMemo<Block[]>(() => {
        if (Array.isArray(utterances) && utterances.length) {
            return buildBlocksFromUtterances(utterances);
        }

        const cleaned = (text ?? "").trim();

        if (!cleaned) return [];

        const speakerBlocks = buildBlocksFromSpeakerLabeledText(cleaned);
        const hasSpeakerLabels = speakerBlocks.some((block) => !!block.speaker);

        return hasSpeakerLabels ? speakerBlocks : buildParagraphBlocks(cleaned);
    }, [text, utterances]);

    const activeUtteranceTimeMs = React.useMemo(() => {
        if (
            !highlightActiveSpeakerBlock ||
            !Array.isArray(utterances) ||
            activeUtteranceIndex < 0 ||
            activeUtteranceIndex >= utterances.length
        ) {
            return null;
        }

        const activeUtterance = utterances[activeUtteranceIndex];

        if (typeof activeUtterance?.start !== "number") {
            return null;
        }

        return activeUtterance.start;
    }, [activeUtteranceIndex, highlightActiveSpeakerBlock, utterances]);

    if (!blocks.length) {
        return (
            <Typography variant="body2" color="text.secondary">
                No transcript text available.
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                pr: 1,
                minHeight: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    ...(disableInternalScroll ? {} : { maxHeight }),
                }}
            >
                <Box
                    sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 3,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        alignItems: "center",
                        px: 0.25,
                        py: 0.75,
                        mb: 1,
                        bgcolor: "background.paper",
                        borderBottom: 1,
                        borderColor: "divider",
                    }}
                >
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showSpeakers}
                                onChange={(e) =>
                                    setShowSpeakers(e.target.checked)
                                }
                                size="small"
                            />
                        }
                        label="Speakers"
                        sx={{ m: 0 }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={showTimestamps}
                                onChange={(e) =>
                                    setShowTimestamps(e.target.checked)
                                }
                                size="small"
                            />
                        }
                        label="Timestamps"
                        sx={{ m: 0 }}
                    />
                </Box>

                <Stack spacing={1.25}>
                    {blocks.map((block, index) => {
                        const activeBlock = isBlockActive({
                            block,
                            activeUtteranceTimeMs,
                            enabled: highlightActiveSpeakerBlock,
                        });

                        return (
                            <Paper
                                key={index}
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: activeBlock
                                        ? "primary.50"
                                        : "action.hover",
                                    borderColor: activeBlock
                                        ? "primary.main"
                                        : "divider",
                                    boxShadow: activeBlock ? 2 : 0,
                                    transition:
                                        "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
                                }}
                            >
                                {(showSpeakers && block.speaker) ||
                                (showTimestamps &&
                                    typeof block.timestampMs === "number") ? (
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="baseline"
                                        mb={0.5}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 700 }}
                                        >
                                            {showSpeakers ? block.speaker : ""}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {showTimestamps &&
                                            typeof block.timestampMs ===
                                                "number"
                                                ? formatMs(block.timestampMs)
                                                : ""}
                                        </Typography>
                                    </Stack>
                                ) : null}

                                <Typography
                                    variant="body2"
                                    sx={{
                                        whiteSpace: "pre-wrap",
                                        lineHeight: 1.7,
                                    }}
                                >
                                    {renderHighlightedBlockText({
                                        block,
                                        words,
                                        activeWordIndex,
                                        enabled: highlightActiveWord,
                                        blockIndex: index,
                                        totalBlocks: blocks.length,
                                    })}
                                </Typography>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        </Box>
    );
};
