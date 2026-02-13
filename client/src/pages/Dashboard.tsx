import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "../components/global/TopBar";
import Sidebar from "../components/global/SideBar";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";

const Dashboard = () => {
    return (
        <Box display="flex" flexDirection="column" height="100vh">
            <CssBaseline enableColorScheme />
            <TopBar />
            <Box display="flex" flexGrow={1}>
                <Sidebar />
                <Box component="main" flexGrow={1} p={3}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};
export default Dashboard;
