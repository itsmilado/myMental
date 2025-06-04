import React from "react";
import "./App.css";
import { Box } from "@mui/material";
import AppRoutes from "./routes/AppRoutes"; // central route config
import { ThemeProvider, CssBaseline, useTheme } from "@mui/material";
// import { theme } from "./theme/theme";

function App() {
    const theme = useTheme();
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box display="flex">
                <Box flexGrow={1} p={3}>
                    <AppRoutes />
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;
