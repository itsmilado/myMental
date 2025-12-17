import {
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
import { ExportButton } from "./ExportButton";
import { DeleteButton } from "./DeleteButton";

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

    const formatDuration = (dur: any): string => {
        if (!dur) return "-";
        if (typeof dur === "string") return dur;
        const h = String(dur.hours ?? 0).padStart(2, "0");
        const m = String(dur.minutes ?? 0).padStart(2, "0");
        const s = String(Math.floor(dur.seconds ?? 0)).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

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
                    bgcolor: "transparent",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    px: 2.5,
                    py: 2,
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
                                    audio_duration
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
                    overflow: "auto",
                    px: 2.5,
                    py: 2,
                }}
            >
                {/* Details */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Details
                </Typography>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            md: "1fr 1fr",
                        },
                        gap: 1,
                        mb: 2,
                    }}
                >
                    <DetailRow
                        label="Recorded at"
                        value={transcription.file_recorded_at}
                    />
                    <DetailRow
                        label="Speech model"
                        value={options?.speech_model}
                    />
                    <DetailRow
                        label="Speaker labels"
                        value={options?.speaker_labels ? "True" : "-"}
                    />
                    <DetailRow
                        label="Speakers expected"
                        value={options?.speakers_expected}
                    />
                    <DetailRow
                        label="Entity detection"
                        value={options?.entity_detection ? "True" : "-"}
                    />
                    <DetailRow
                        label="Sentiment analysis"
                        value={options?.sentiment_analysis ? "True" : "-"}
                    />
                    <DetailRow
                        label="Format text"
                        value={options?.format_text ? "True" : "-"}
                    />
                    <DetailRow
                        label="Punctuate"
                        value={options?.punctuate ? "True" : "-"}
                    />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Transcript */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Transcription
                </Typography>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "action.hover",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.7,
                        maxHeight: { xs: "none", md: 420 },
                        overflow: "auto",
                    }}
                >
                    <Typography variant="body2">
                        {transcription.transcription || "-"}
                    </Typography>
                </Paper>
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
