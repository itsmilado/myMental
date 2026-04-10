// src/features/transcription/components/TranscriptionDetailContent.tsx

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

    const formatDuration = (dur: any): string => {
        if (!dur) return "-";
        if (typeof dur === "string") return dur;
        const h = String(dur.hours ?? 0).padStart(2, "0");
        const m = String(dur.minutes ?? 0).padStart(2, "0");
        const s = String(Math.floor(dur.seconds ?? 0)).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    const formatDate = (value: string | null | undefined) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value; // fallback to raw if invalid

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        // dd.MM.yyyy HH:mm
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
            {/* ───────────────── Header (sticky) ───────────────── */}
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

            {/* ───────────────── Body (scrollable) ───────────────── */}
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
                        <AudioPlayer src={audioSrc} />
                    </Box>
                ) : null}

                <Divider />

                {/* Transcript */}
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
                            utterances={transcription.utterances}
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
