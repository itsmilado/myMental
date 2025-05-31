import {
    Box,
    Typography,
    useTheme,
    Avatar,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
} from "@mui/material";

import {
    Home as HomeIcon,
    Person as PersonIcon,
    Article as ArticleIcon,
    PictureAsPdf as PdfIcon,
    Checklist as ChecklistIcon,
    CalendarMonth as CalendarIcon,
} from "@mui/icons-material";

import { tokens } from "../../theme";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarItem } from "../../types";

const Sidebar = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as "light" | "dark");
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems: SidebarItem[] = [
        { text: "Overview", icon: <HomeIcon />, path: "/dashboard" },
        { text: "Profile", icon: <PersonIcon />, path: "/profile" },
        {
            text: "Transcriptions",
            icon: <ArticleIcon />,
            path: "/transcriptions",
        },
        { text: "Documents", icon: <PdfIcon />, path: "/documents" },
        { text: "Tasks", icon: <ChecklistIcon />, path: "/tasks" },
        { text: "Calendar", icon: <CalendarIcon />, path: "/calendar" },
    ];

    return (
        <Box
            width="260px"
            height="100vh"
            display="flex"
            flexDirection="column"
            bgcolor={colors.primary[400]}
            sx={{ borderRight: `1px solid ${colors.grey[700]}`, px: 2, py: 3 }}
        >
            {/* Avatar and Username */}
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                mb={4}
            >
                <Avatar sx={{ width: 64, height: 64, mb: 1 }} />
                <Typography variant="h5" color={colors.grey[100]}>
                    User Name
                </Typography>
            </Box>

            <Divider sx={{ mb: 2, bgcolor: colors.grey[600] }} />

            {/* Menu */}
            <List disablePadding>
                {menuItems.map((item) => (
                    <ListItemButton
                        key={item.text}
                        onClick={() => navigate(item.path)}
                        sx={{
                            my: 0.5,
                            borderRadius: "8px",
                            backgroundColor:
                                location.pathname === item.path
                                    ? colors.blueAccent[600]
                                    : "transparent",
                            "&:hover": {
                                backgroundColor: colors.blueAccent[700],
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: colors.grey[100] }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography
                                    color={colors.grey[100]}
                                    fontWeight={
                                        location.pathname === item.path
                                            ? "bold"
                                            : "normal"
                                    }
                                >
                                    {item.text}
                                </Typography>
                            }
                        />
                    </ListItemButton>
                ))}
            </List>
        </Box>
    );
};

export default Sidebar;
