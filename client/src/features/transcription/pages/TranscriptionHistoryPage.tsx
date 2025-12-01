// src/features/transcription/pages/TranscriptionHistoryPage.tsx

import * as React from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const TranscriptionHistoryPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const navigate = useNavigate();
    const location = useLocation();
    const tabConfig = [
        {
            label: "Offline",
            path: "offline",
        },
        {
            label: "Online",
            path: "online",
        },
    ];

    const getTabIndexFromPath = (pathname: string): number => {
        // expects .../history/slug, defaults to 0 ("offline")
        const parts = pathname.split("/").filter(Boolean);
        const slug = parts[parts.length - 1];
        const index = tabConfig.findIndex((tab) => tab.path === slug);
        return index === -1 ? 0 : index;
    };

    function a11yProps(index: number) {
        return {
            id: `simple-tab-${index}`,
            "aria-controls": `simple-tabpanel-${index}`,
        };
    }

    const value = getTabIndexFromPath(location.pathname);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        const path = tabConfig[newValue].path;
        navigate(`/dashboard/transcriptions/history/${path}`);
    };

    return (
        <Box sx={{ width: "100%" }}>
            <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                    value={value}
                    onChange={handleTabChange}
                    aria-label="history tabs"
                    textColor="inherit" // let sx control the colors fully
                    slotProps={{
                        indicator: {
                            sx: {
                                backgroundColor: colors.greenAccent[500], // active underline color
                                height: 3,
                                borderRadius: 1,
                            },
                        },
                    }}
                    sx={{
                        // base (inactive) tab label
                        "& .MuiTab-root": {
                            color: colors.grey[100],
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "1rem", // larger text
                            letterSpacing: "0.3px", // subtle spacing for readability
                            minHeight: 48, // taller tabs for better touch area
                            px: 3, // horizontal padding
                            py: 1,
                        },
                        // active tab label
                        "& .MuiTab-root.Mui-selected": {
                            color: colors.greenAccent[500],
                            fontWeight: 700,
                        },
                        // hover (optional)
                        "& .MuiTab-root:hover": {
                            color: colors.grey[200],
                        },
                    }}
                >
                    <Tab label="Offline" {...a11yProps(0)} />
                    <Tab label="Online" {...a11yProps(1)} />
                </Tabs>
            </Box>
            <Outlet />
        </Box>
    );
};

export default TranscriptionHistoryPage;
