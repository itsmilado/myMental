// src/features/transcription/pages/OnlineHistoryPage.tsx

import { Typography, Paper, Box } from "@mui/material";

const OnlineHistoryPage = () => {
    return (
        <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="h4" gutterBottom>
                Online Transcription History
            </Typography>
            <Box mt={2}>
                {/* Table, sidebar, etc. to be implemented next */}
                Coming soon...
            </Box>
        </Paper>
    );
};

export default OnlineHistoryPage;
