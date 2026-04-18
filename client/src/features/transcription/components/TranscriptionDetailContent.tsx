// src/features/transcription/components/TranscriptionDetailContent.tsx

import * as React from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Divider,
    Typography,
    IconButton,
    Stack,
    Chip,
    Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { ExportButton } from "./ExportButton";
import { DeleteButton } from "./DeleteButton";
import { getAudioStreamUrl } from "../../auth/api";
import { AudioPlayer } from "./AudioPlayer";
import { TranscriptText } from "./TranscriptText";
import { useTranscriptPlaybackSync } from "../hooks/useTranscriptPlaybackSync";
import { normalizeOfflineHistoryMetadata } from "../utils/transcriptionHistoryAdapters";

type DeleteArgs = {
    deleteFromAssembly: boolean;
    deleteServerFiles: boolean;
    deleteFromDb: boolean;
};

type Props = {
    transcription: any;
    showActions: boolean;
    onBack: () => void; // kept for page usage
    onClose: () => void;
    onDelete: (args: DeleteArgs) => Promise<string>;
    onOpenFullPage?: () => void;
};

export const TranscriptionDetailContent = ({
    transcription,
    showActions,
    onClose,
    onDelete,
    onOpenFullPage,
}: Props) => {
    const { options, audio_duration } = transcription ?? {};

    const metadata = normalizeOfflineHistoryMetadata(transcription);
    const [currentTimeSeconds, setCurrentTimeSeconds] = React.useState(0);

    const timing = React.useMemo(() => {
        return {
            words: transcription?.words ?? null,
            utterances: transcription?.utterances ?? null,
        };
    }, [transcription?.words, transcription?.utterances]);

    const {
        activeWordIndex,
        activeUtteranceIndex,
        hasWordTiming,
        hasUtteranceTiming,
    } = useTranscriptPlaybackSync({
        currentTimeSeconds,
        timing,
    });

    /*
    - purpose: normalize mixed duration shapes for metadata display
    - inputs: persisted duration value from the offline transcription record
    - outputs: human-readable duration string or fallback placeholder
    - important behavior: supports both legacy structured duration objects and
      already-formatted string values
    */

    const formatDuration = (dur: any): string => {
        if (!dur) return "-";
        if (typeof dur === "string") return dur;
        const h = String(dur.hours ?? 0).padStart(2, "0");
        const m = String(dur.minutes ?? 0).padStart(2, "0");
        const s = String(Math.floor(dur.seconds ?? 0)).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    /*
    - purpose: format timestamp-like metadata fields for the detail view
    - inputs: optional ISO-like date string from the transcription record
    - outputs: localized display string or safe fallback value
    - important behavior: returns the raw value when parsing fails so malformed data
      stays visible instead of disappearing
    */

    const formatDate = (value: string | null | undefined) => {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${day}.${month}.${year}_${hours}:${minutes}`;
    };

    const fileName = transcription?.file_name;
    const audioSrc = fileName ? getAudioStreamUrl(fileName) : "";

    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header (sticky) */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bgcolor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    px: 2.5,
                    py: 2,
                    boxShadow: 1,
                }}
            >
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={2}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 700 }}
                            noWrap
                        >
                            {transcription.file_name}
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1, flexWrap: "wrap" }}
                        >
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`DB: ${transcription.id}`}
                            />
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`API: ${transcription.transcript_id}`}
                            />
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Duration: ${formatDuration(
                                    audio_duration,
                                )}`}
                            />
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Lang: ${options?.language_code || "-"}`}
                            />
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center">
                        {onOpenFullPage && (
                            <IconButton
                                onClick={onOpenFullPage}
                                aria-label="open full page"
                                size="small"
                            >
                                <OpenInNewIcon fontSize="small" />
                            </IconButton>
                        )}

                        {showActions && (
                            <>
                                <ExportButton
                                    transcriptId={transcription.id}
                                    fileName={transcription.file_name}
                                />
                                <DeleteButton onDelete={onDelete} />
                            </>
                        )}

                        <IconButton
                            onClick={onClose}
                            aria-label="close"
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Box>
            </Box>

            {/* Shared metadata section used by both modal and full-page offline detail views */}

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    px: 2.5,
                    py: 2,
                    gap: 2,
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                <Accordion
                    disableGutters
                    defaultExpanded={false}
                    sx={{
                        borderRadius: 2,
                        "&:before": { display: "none" },
                        backgroundColor: "transparent",
                        boxShadow: "none",
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                        >
                            Metadata
                        </Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "1fr 1fr",
                                },
                                gap: 1,
                            }}
                        >
                            <DetailRow
                                label="Source"
                                value={metadata.sourceLabel}
                            />
                            <DetailRow
                                label="Project"
                                value={metadata.projectLabel}
                            />
                            <DetailRow
                                label="Project source"
                                value={metadata.projectSourceLabel}
                            />
                            <DetailRow
                                label="Speech model"
                                value={metadata.speechModelLabel}
                            />
                            <DetailRow
                                label="Language"
                                value={metadata.languageLabel}
                            />
                            <DetailRow
                                label="Speaker mode"
                                value={metadata.speakerModeLabel}
                            />
                            <DetailRow
                                label="Known speakers"
                                value={
                                    metadata.knownSpeakerValues.length > 0
                                        ? metadata.knownSpeakerValues.join(", ")
                                        : "Not configured"
                                }
                            />
                            <DetailRow
                                label="Recorded at"
                                value={formatDate(metadata.recordedAtLabel)}
                            />
                            <DetailRow
                                label="Transcribed at"
                                value={formatDate(metadata.transcribedAtLabel)}
                            />
                            {metadata.speechModelLabel === "universal-3-pro" ? (
                                <DetailRow
                                    label="Prompt"
                                    value={metadata.prompt || "Not selected"}
                                />
                            ) : null}
                            <DetailRow
                                label="Format text"
                                value={options?.format_text ? "True" : "-"}
                            />
                            <DetailRow
                                label="Punctuate"
                                value={options?.punctuate ? "True" : "-"}
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>
                {fileName ? (
                    <Box>
                        <AudioPlayer
                            src={audioSrc}
                            onTimeChange={setCurrentTimeSeconds}
                            onSeek={setCurrentTimeSeconds}
                            onEnded={() => setCurrentTimeSeconds(0)}
                        />
                    </Box>
                ) : null}

                <Divider />

                {/* Transcript panel; playback-synced highlight props are wired here */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: { xs: 320, md: 360 },
                        flex: 1,
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, mb: 1, flexShrink: 0 }}
                    >
                        Transcription
                    </Typography>

                    <Paper
                        variant="outlined"
                        sx={{
                            px: 2,
                            py: 1.5,
                            borderRadius: 2,
                            bgcolor: "action.hover",
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            minHeight: 0,
                            overflow: "hidden",
                        }}
                    >
                        <TranscriptText
                            text={transcription.transcription}
                            utterances={timing.utterances}
                            words={timing.words}
                            activeWordIndex={activeWordIndex}
                            activeUtteranceIndex={activeUtteranceIndex}
                            highlightActiveWord={hasWordTiming}
                            highlightActiveSpeakerBlock={hasUtteranceTiming}
                            defaultShowSpeakers
                            defaultShowTimestamps={false}
                            disableInternalScroll
                        />
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};

const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            px: 1.25,
            py: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
        }}
    >
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography
            variant="body2"
            sx={{ fontWeight: 600, textAlign: "right" }}
        >
            {value ?? "-"}
        </Typography>
    </Box>
);
