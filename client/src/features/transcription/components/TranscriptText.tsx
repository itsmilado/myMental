import * as React from "react";
import {
    Box,
    Paper,
    Stack,
    Switch,
    FormControlLabel,
    Typography,
} from "@mui/material";

export type TranscriptUtterance = {
    speaker: string | number | null;
    text: string;
    start: number | null; // ms
    end: number | null; // ms
};

type Block = {
    speaker?: string | null;
    timestampMs?: number | null;
    lines: string[];
};

type Props = {
    text?: string | null;
    utterances?: TranscriptUtterance[] | null;
    defaultShowSpeakers?: boolean;
    defaultShowTimestamps?: boolean;
    maxHeight?: number | string;
};

const formatMs = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const normalizeSpeaker = (
    s: string | number | null | undefined,
): string | null => {
    if (s == null) return null;
    const value = String(s).trim();
    return value.length ? value : null;
};

const labelSpeaker = (speaker: string): string => {
    return speaker.startsWith("Speaker") ? speaker : `Speaker ${speaker}`;
};

const buildBlocksFromUtterances = (
    utterances: TranscriptUtterance[],
): Block[] => {
    const blocks: Block[] = [];

    for (const u of utterances) {
        const line = (u.text ?? "").trim();
        if (!line) continue;

        const rawSpeaker = normalizeSpeaker(u.speaker);
        const speaker = rawSpeaker ? labelSpeaker(rawSpeaker) : null;
        const timestampMs = typeof u.start === "number" ? u.start : null;

        const prev = blocks[blocks.length - 1];
        const sameSpeaker = prev && prev.speaker === speaker;

        if (sameSpeaker) {
            prev.lines.push(line);
        } else {
            blocks.push({
                speaker,
                timestampMs,
                lines: [line],
            });
        }
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
                current = { speaker: label, timestampMs: null, lines: [body] };
            }
            continue;
        }

        if (!current) current = { speaker: null, timestampMs: null, lines: [] };
        current.lines.push(line);
    }

    flush();
    return blocks;
};

const buildParagraphBlocks = (text: string): Block[] => {
    return text
        .split(/\n\s*\n/g)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ speaker: null, timestampMs: null, lines: [p] }));
};

export const TranscriptText: React.FC<Props> = ({
    text,
    utterances,
    defaultShowSpeakers = true,
    defaultShowTimestamps = false,
    maxHeight = 420,
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
        const hasSpeakerLabels = speakerBlocks.some((b) => !!b.speaker);

        return hasSpeakerLabels ? speakerBlocks : buildParagraphBlocks(cleaned);
    }, [text, utterances]);

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
                overflow: "hidden",
                minHeight: 0,
            }}
        >
            <Stack direction="row" spacing={2} mb={1} flexWrap="wrap">
                <FormControlLabel
                    control={
                        <Switch
                            checked={showSpeakers}
                            onChange={(e) => setShowSpeakers(e.target.checked)}
                            size="small"
                        />
                    }
                    label="Speakers"
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
                />
            </Stack>

            <Box sx={{ maxHeight, overflowY: "auto", overflowX: "hidden" }}>
                <Stack spacing={1.25}>
                    {blocks.map((b, idx) => (
                        <Paper
                            key={idx}
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "action.hover",
                            }}
                        >
                            {(showSpeakers && b.speaker) ||
                            (showTimestamps &&
                                typeof b.timestampMs === "number") ? (
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
                                        {showSpeakers ? b.speaker : ""}
                                    </Typography>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {showTimestamps &&
                                        typeof b.timestampMs === "number"
                                            ? formatMs(b.timestampMs)
                                            : ""}
                                    </Typography>
                                </Stack>
                            ) : null}

                            <Typography
                                variant="body2"
                                sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}
                            >
                                {b.lines.join("\n")}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
};
