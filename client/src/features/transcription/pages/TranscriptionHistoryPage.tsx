// src/features/transcription/pages/TranscriptionHistoryPage.tsx

import * as React from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

const TranscriptionHistoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const tabConfig = [
        {
            label: "My Transcriptions",
            path: "app",
        },
        {
            label: "AssemblyAI History",
            path: "assemblyai",
        },
    ];

    const getTabIndexFromPath = (pathname: string): number => {
        // expects .../history/slug, defaults to 0 ("app")
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
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "1rem",
                            letterSpacing: "0.3px",
                            minHeight: 48,
                            px: 3,
                            py: 1,
                        },
                        "& .MuiTab-root.Mui-selected": {
                            fontWeight: 700,
                        },
                    }}
                >
                    <Tab label="My Transcriptions" {...a11yProps(0)} />
                    <Tab label="AssemblyAI History" {...a11yProps(1)} />
                </Tabs>
            </Box>
            <Outlet />
        </Box>
    );
};

export default TranscriptionHistoryPage;
