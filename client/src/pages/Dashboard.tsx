import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/global/SideBar";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";

const Dashboard = () => {
    return (
        <Box display="flex">
            <CssBaseline />
            <Sidebar />
            <Box component="main" flexGrow={1} p={3}>
                <Outlet />
            </Box>
        </Box>
    );
};
export default Dashboard;
