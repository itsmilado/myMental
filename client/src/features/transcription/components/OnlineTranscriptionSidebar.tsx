// /features/transcription/components/OnlineTranscriptionSidebar.tsx

import * as React from "react";
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    Stack,
    Chip,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { getAudioStreamUrl } from "../../auth/api";
import { AudioPlayer } from "./AudioPlayer";
import { OnlineTranscription } from "../../../types/types";
import { TranscriptText } from "./TranscriptText";

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

                    {/* Core metadata */}
                    <Stack spacing={1} mb={2}>
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

                        {/* Metadata chips */}
                        <Typography variant="subtitle2" color="text.secondary">
                            Metadata
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            mb={1}
                        >
                            {isDeleted && (
                                <Chip
                                    size="small"
                                    label="Deleted in AssemblyAI"
                                    color="warning"
                                    variant="outlined"
                                />
                            )}
                            <Chip
                                size="small"
                                label={`Status: ${transcription.status}`}
                            />

                            {transcription.speech_model && (
                                <Chip
                                    size="small"
                                    label={transcription.speech_model}
                                />
                            )}
                            {transcription.language && (
                                <Chip
                                    size="small"
                                    label={transcription.language}
                                />
                            )}
                            {transcription.audio_duration && (
                                <Chip
                                    size="small"
                                    label={`Duration: ${transcription.audio_duration}`}
                                />
                            )}
                        </Stack>

                        <Typography variant="subtitle2" color="text.secondary">
                            Project
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ wordBreak: "break-all" }}
                        >
                            {transcription.project || "-"}
                        </Typography>

                        {transcription.features &&
                            transcription.features.length > 0 && (
                                <>
                                    <Typography variant="subtitle2">
                                        Features
                                    </Typography>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        flexWrap="wrap"
                                        mb={1}
                                    >
                                        {transcription.features.map((f) => (
                                            <Chip
                                                key={f}
                                                label={f}
                                                size="small"
                                            />
                                        ))}
                                    </Stack>
                                </>
                            )}
                    </Stack>

                    <Divider sx={{ mt: 2, mb: 2 }} />

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
