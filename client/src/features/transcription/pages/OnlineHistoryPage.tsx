// src/features/transcription/pages/OnlineHistoryPage.tsx

import * as React from "react";
import { Box, Paper } from "@mui/material";
import { mockOnlineTranscriptions } from "../mock/mockOnlineTranscriptions";
import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { OnlineTranscription } from "../../../types/types";

export const OnlineHistoryPage = () => {
    const [selected, setSelected] = React.useState<OnlineTranscription | null>(
        null
    );

    return (
        <Paper sx={{ p: 3, borderRadius: 3, position: "relative" }}>
            <Box mb={2} fontSize={24} fontWeight={600}>
                Online Transcription History
            </Box>
            <OnlineTranscriptionTable
                data={mockOnlineTranscriptions}
                onDetails={setSelected}
            />
            <OnlineTranscriptionSidebar
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};

export default OnlineHistoryPage;
