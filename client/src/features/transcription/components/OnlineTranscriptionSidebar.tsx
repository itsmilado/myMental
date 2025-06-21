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
import { OnlineTranscription } from "../../../types/types";

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

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 400,
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        p: 3,
                    },
                },
            }}
            ModalProps={{ keepMounted: true }}
        >
            <Box position="relative" height="100%">
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 8, right: 8 }}
                    aria-label="close"
                >
                    <ChevronRightIcon />
                </IconButton>
                <Typography variant="h6" mb={1}>
                    Transcript Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack gap={1}>
                    <Typography variant="subtitle2">Transcript ID</Typography>
                    <Typography>{transcription.transcript_id}</Typography>
                    <Typography variant="subtitle2">Audio URL</Typography>
                    <Typography>
                        <a
                            href={transcription.audio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {transcription.audio_url}
                        </a>
                    </Typography>
                    <Typography variant="subtitle2">Audio Duration</Typography>
                    <Typography>
                        {transcription.audio_duration || "-"}
                    </Typography>
                    <Typography variant="subtitle2">Speech Model</Typography>
                    <Typography>{transcription.speech_model}</Typography>
                    <Typography variant="subtitle2">Language</Typography>
                    <Typography>{transcription.language}</Typography>
                    <Typography variant="subtitle2">Features</Typography>
                    <Stack direction="row" spacing={1} mb={1}>
                        {transcription.features?.map((f) => (
                            <Chip key={f} label={f} size="small" />
                        )) || "-"}
                    </Stack>
                    <Typography variant="subtitle2">Project</Typography>
                    <Typography>{transcription.project || "-"}</Typography>
                </Stack>
            </Box>
        </Drawer>
    );
};
