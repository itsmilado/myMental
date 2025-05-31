import React from "react";
import "./App.css";
import Sidebar from "./components/global/SideBar";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Box } from "@mui/material";

function App() {
    return (
        <Box display="flex">
            <Sidebar />
            <Box flexGrow={1} p={3}>
                {/* Your Routes will render here */}
            </Box>
        </Box>
    );
}

export default App;
