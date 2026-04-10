// src/features/transcription/components/OnlineTranscriptionSidebar.tsx

import * as React from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    Stack,
    Chip,
    Grid,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { getAudioStreamUrl } from "../../auth/api";
import { AudioPlayer } from "./AudioPlayer";
import { OnlineTranscription } from "../../../types/types";
import { TranscriptText } from "./TranscriptText";
import { normalizeOnlineHistoryMetadata } from "../utils/transcriptionHistoryAdapters";

/*
- Renders one metadata field with a compact card-like presentation
- Keeps the sidebar metadata readable in a two-column layout
*/
const DetailItem = ({ label, value }: { label: string; value: string }) => {
    return (
        <Box
            sx={{
                height: "100%",
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.default",
            }}
        >
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5 }}
            >
                {label}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                {value}
            </Typography>
        </Box>
    );
};

type Props = {
    open: boolean;
    transcription: OnlineTranscription | null;
    onClose: () => void;
};

export const OnlineTranscriptionSidebar: React.FC<Props> = ({
    open,
    transcription,
    onClose,
}) => {
    if (!transcription) return null;

    const isDeleted = transcription.audio_url === "http://deleted_by_user";
    const audioSrc = transcription.file_name
        ? getAudioStreamUrl(transcription.file_name)
        : null;

    const metadata = normalizeOnlineHistoryMetadata(transcription);

    const getMetadataValue = (
        value: string | null | undefined,
        fallback: string,
    ): string => {
        const normalized = value?.toString().trim();
        return normalized ? normalized : fallback;
    };

    const formatDateTime = (value: string | null | undefined): string => {
        if (!value) return "Not available";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 500,
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        p: 3,
                    },
                },
            }}
            ModalProps={{ keepMounted: true }}
        >
            <Box position="relative" height="100%">
                <Stack spacing={2} p={2}>
                    {/* Header */}
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography variant="h6">Transcript Details</Typography>
                        <IconButton onClick={onClose} size="small">
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>

                    <Divider />

                    <Stack spacing={1.25} mb={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Transcript ID
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ wordBreak: "break-all" }}
                        >
                            {transcription.transcript_id}
                        </Typography>

                        <Typography variant="subtitle2" color="text.secondary">
                            File Name
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ wordBreak: "break-all" }}
                        >
                            {transcription.file_name || "Not available"}
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            mb={0.5}
                        >
                            {isDeleted ? (
                                <Chip
                                    size="small"
                                    label="Deleted in AssemblyAI"
                                    color="warning"
                                    variant="outlined"
                                />
                            ) : null}

                            <Chip
                                size="small"
                                label={`Status: ${getMetadataValue(
                                    transcription.status,
                                    "Not available",
                                )}`}
                            />
                        </Stack>
                    </Stack>

                    <Divider sx={{ mt: 1, mb: 2 }} />

                    <Accordion
                        disableGutters
                        defaultExpanded={false}
                        sx={{
                            mb: 1,
                            borderRadius: 2,
                            "&:before": { display: "none" },
                            backgroundColor: "transparent",
                            boxShadow: "none",
                            border: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
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

                        <AccordionDetails sx={{ pt: 0.5 }}>
                            <Grid container spacing={1.25}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Project"
                                        value={getMetadataValue(
                                            metadata.projectLabel,
                                            "Not selected",
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Project source"
                                        value={getMetadataValue(
                                            metadata.projectSourceLabel,
                                            "Not configured",
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Speech model"
                                        value={getMetadataValue(
                                            metadata.speechModelLabel,
                                            "Not available",
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Language"
                                        value={getMetadataValue(
                                            metadata.languageLabel,
                                            "Not available",
                                        )}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Speaker mode"
                                        value={getMetadataValue(
                                            metadata.speakerModeLabel,
                                            "Not configured",
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Known speakers"
                                        value={
                                            metadata.knownSpeakerValues.length >
                                            0
                                                ? metadata.knownSpeakerValues.join(
                                                      ", ",
                                                  )
                                                : "Not configured"
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Recorded at"
                                        value={formatDateTime(
                                            metadata.recordedAtLabel,
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <DetailItem
                                        label="Transcribed at"
                                        value={formatDateTime(
                                            metadata.transcribedAtLabel,
                                        )}
                                    />
                                </Grid>
                                {metadata.speechModelLabel ===
                                "universal-3-pro" ? (
                                    <Grid size={{ xs: 12, sm: 12 }}>
                                        <DetailItem
                                            label="Prompt"
                                            value={getMetadataValue(
                                                metadata.prompt,
                                                "Not selected",
                                            )}
                                        />
                                    </Grid>
                                ) : null}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {transcription.features &&
                    transcription.features.length > 0 ? (
                        <>
                            <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 700, mt: 2 }}
                            >
                                Features
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {transcription.features.map((feature) => (
                                    <Chip
                                        key={feature}
                                        label={feature}
                                        size="small"
                                        variant="outlined"
                                    />
                                ))}
                            </Stack>
                        </>
                    ) : null}

                    <AudioPlayer
                        src={audioSrc || ""}
                        disabled={isDeleted}
                        disabledMessage={
                            isDeleted ? "Deleted by user." : undefined
                        }
                    />

                    <Divider sx={{ my: 2 }} />

                    {/* Transcript Text section */}
                    <Typography variant="h6" mb={1}>
                        Transcript Text
                    </Typography>

                    <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
                        <TranscriptText
                            text={transcription.transcription}
                            utterances={transcription.utterances}
                            maxHeight="50vh"
                        />
                    </Box>
                </Stack>
            </Box>
        </Drawer>
    );
};
