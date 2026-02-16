// src/features/settings/pages/SettingsPage.tsx

import { Box, Paper, Typography } from "@mui/material";

const SettingsPage = () => {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Settings
            </Typography>

            <Paper sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    Settings page placeholder. We’ll either merge this into
                    Preferences or reserve it for app-wide/admin settings.
                </Typography>
            </Paper>
        </Box>
    );
};

export default SettingsPage;
