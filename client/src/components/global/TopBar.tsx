import axios from "axios";
import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import { LightMode, DarkMode, Logout } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { tokens } from "../../theme/theme";
import { useColorMode } from "../../theme/theme"; // your context provider

const TopBar = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { toggleColorMode } = useColorMode();
    const navigate = useNavigate();

    const handleLogout = async () => {
        localStorage.removeItem("user");
        try {
            await axios.post("http://localhost:5000/users/logout");
        } catch (error) {
            console.error("Logout failed:", error);
        }
        console.log("Logout successful");
        navigate("/");
    };

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                backgroundColor: colors.primary[400],
                borderBottom: `1px solid ${colors.grey[100]}`,
            }}
        >
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" fontWeight="bold">
                    Dashboard
                </Typography>

                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton onClick={toggleColorMode} color="inherit">
                        {theme.palette.mode === "dark" ? (
                            <LightMode />
                        ) : (
                            <DarkMode />
                        )}
                    </IconButton>
                    <IconButton onClick={handleLogout} color="inherit">
                        <Logout />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default TopBar;
