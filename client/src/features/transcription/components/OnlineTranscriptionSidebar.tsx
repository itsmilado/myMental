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
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { getAudioStreamUrl } from "../../auth/api";
import { AudioPlayer } from "./AudioPlayer";
import { OnlineTranscription } from "../../../types/types";
import { TranscriptText } from "./TranscriptText";
import { normalizeOnlineHistoryMetadata } from "../utils/transcriptionHistoryAdapters";

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
                            {transcription.file_name || "-"}
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
                                label={`Status: ${transcription.status}`}
                            />

                            {transcription.audio_duration ? (
                                <Chip
                                    size="small"
                                    label={`Duration: ${transcription.audio_duration}`}
                                />
                            ) : null}
                        </Stack>
                    </Stack>

                    <Accordion
                        disableGutters
                        defaultExpanded={false}
                        sx={{
                            mt: 2,
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
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    <strong>Source:</strong>{" "}
                                    {metadata.sourceLabel}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Project:</strong>{" "}
                                    {transcription.project || "-"}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Connection:</strong>{" "}
                                    {metadata.connectionLabel || "-"}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Connection source:</strong>{" "}
                                    {metadata.connectionSourceLabel || "-"}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Speech model:</strong>{" "}
                                    {metadata.speechModelLabel || "-"}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Language:</strong>{" "}
                                    {metadata.languageLabel || "-"}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Speaker mode:</strong>{" "}
                                    {metadata.speakerModeLabel || "-"}
                                </Typography>

                                {transcription.features &&
                                transcription.features.length > 0 ? (
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        flexWrap="wrap"
                                        pt={0.5}
                                    >
                                        {transcription.features.map(
                                            (feature) => (
                                                <Chip
                                                    key={feature}
                                                    label={feature}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ),
                                        )}
                                    </Stack>
                                ) : null}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

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
