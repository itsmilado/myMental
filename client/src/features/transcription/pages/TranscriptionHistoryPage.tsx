// src/features/transcription/pages/TranscriptionHistoryPage.tsx

import * as React from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

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

const TranscriptionHistoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
                    aria-label="basic tabs example"
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
