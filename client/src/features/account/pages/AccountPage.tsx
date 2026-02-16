// src/features/account/pages/AcccountPage.tsx

import { useState } from "react";
import { Box, Paper, Typography, Button, Stack, Divider } from "@mui/material";
import { useAuthStore } from "../../../store/useAuthStore";
import ProfileDialog from "../../profile/components/ProfileDialog";

const AccountPage = () => {
    const user = useAuthStore((s) => s.user);
    const [openProfileDialog, setOpenProfileDialog] = useState(false);

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Account
            </Typography>

            <Paper sx={{ p: 3 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Name
                        </Typography>
                        <Typography>
                            {user?.first_name} {user?.last_name}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Email
                        </Typography>
                        <Typography>{user?.email}</Typography>
                    </Box>

                    <Divider />

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            onClick={() => setOpenProfileDialog(true)}
                        >
                            Edit profile
                        </Button>

                        <Button variant="outlined" disabled>
                            Change password (soon)
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <ProfileDialog
                open={openProfileDialog}
                onClose={() => setOpenProfileDialog(false)}
            />
        </Box>
    );
};

export default AccountPage;
