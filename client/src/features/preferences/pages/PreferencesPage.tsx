// src/features/preerences/pages/PreferencesPage.tsx

import { Box, Paper, Typography } from "@mui/material";

const PreferencesPage = () => {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Preferences
            </Typography>

            <Paper sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    Preferences UI will live here (theme, language,
                    notifications, transcription defaults, etc.).
                </Typography>
            </Paper>
        </Box>
    );
};

export default PreferencesPage;
