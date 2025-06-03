import { useState, useEffect } from "react";
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
    Collapse,
} from "@mui/material";
import {
    Home as HomeIcon,
    Person as PersonIcon,
    Article as ArticleIcon,
    PictureAsPdf as PdfIcon,
    Checklist as ChecklistIcon,
    CalendarMonth as CalendarIcon,
    ExpandLess,
    ExpandMore,
    BarChart as BarChartIcon,
    Assessment as AssessmentIcon,
    Settings as SettingsIcon,
    Edit as EditIcon,
    Lock as LockIcon,
    Notifications as NotificationsIcon,
    Upload as UploadIcon,
    History as HistoryIcon,
    Share as ShareIcon,
    Task as TaskIcon,
    Event as EventIcon,
    Alarm as AlarmIcon,
    HolidayVillage as HolidayVillageIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarItemProps, SubMenuItemProps } from "../../types";

const Sidebar = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as "light" | "dark");
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Menu items with submenus and icons
    const menuItems: SidebarItemProps[] = [
        {
            text: "Overview",
            icon: <HomeIcon />,
            path: "/dashboard",
            subMenu: [
                {
                    text: "Analytics",
                    path: "/dashboard/analytics",
                    icon: <BarChartIcon />,
                },
                {
                    text: "Reports",
                    path: "/dashboard/reports",
                    icon: <AssessmentIcon />,
                },
                {
                    text: "Settings",
                    path: "/dashboard/settings",
                    icon: <SettingsIcon />,
                },
            ],
        },
        {
            text: "Profile",
            icon: <PersonIcon />,
            path: "/profile",
            subMenu: [
                {
                    text: "Edit Profile",
                    path: "/profile/edit",
                    icon: <EditIcon />,
                },
                {
                    text: "Privacy",
                    path: "/profile/privacy",
                    icon: <LockIcon />,
                },
                {
                    text: "Notifications",
                    path: "/profile/notifications",
                    icon: <NotificationsIcon />,
                },
            ],
        },
        {
            text: "Transcriptions",
            icon: <ArticleIcon />,
            path: "/transcriptions",
            subMenu: [
                {
                    text: "Upload",
                    path: "/transcriptions/upload",
                    icon: <UploadIcon />,
                },
                {
                    text: "History",
                    path: "/transcriptions/history",
                    icon: <HistoryIcon />,
                },
                {
                    text: "Settings",
                    path: "/transcriptions/settings",
                    icon: <SettingsIcon />,
                },
            ],
        },
        {
            text: "Documents",
            icon: <PdfIcon />,
            path: "/documents",
            subMenu: [
                {
                    text: "Upload",
                    path: "/documents/upload",
                    icon: <UploadIcon />,
                },
                {
                    text: "Shared",
                    path: "/documents/shared",
                    icon: <ShareIcon />,
                },
                {
                    text: "Archived",
                    path: "/documents/archived",
                    icon: <HistoryIcon />,
                },
            ],
        },
        {
            text: "Tasks",
            icon: <ChecklistIcon />,
            path: "/tasks",
            subMenu: [
                {
                    text: "My Tasks",
                    path: "/tasks/my-tasks",
                    icon: <TaskIcon />,
                },
                {
                    text: "Team Tasks",
                    path: "/tasks/team-tasks",
                    icon: <TaskIcon />,
                },
                {
                    text: "Completed",
                    path: "/tasks/completed",
                    icon: <TaskIcon />,
                },
            ],
        },
        {
            text: "Calendar",
            icon: <CalendarIcon />,
            path: "/calendar",
            subMenu: [
                {
                    text: "Events",
                    path: "/calendar/events",
                    icon: <EventIcon />,
                },
                {
                    text: "Reminders",
                    path: "/calendar/reminders",
                    icon: <AlarmIcon />,
                },
                {
                    text: "Holidays",
                    path: "/calendar/holidays",
                    icon: <HolidayVillageIcon />,
                },
            ],
        },
    ];

    return (
        <Box
            width={isCollapsed ? "80px" : "260px"}
            height="100vh"
            display="flex"
            flexDirection="column"
            bgcolor={colors.primary[400]}
            sx={{ borderRight: `1px solid ${colors.grey[100]}`, px: 2, py: 3 }}
        >
            {/* Collapse Button */}
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <ListItemButton
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    sx={{
                        borderRadius: "8px",
                        backgroundColor: colors.blueAccent[600],
                        "&:hover": {
                            backgroundColor: colors.blueAccent[700],
                        },
                    }}
                >
                    <ListItemIcon sx={{ color: colors.grey[100] }}>
                        {isCollapsed ? "▶" : "◀"}
                    </ListItemIcon>
                </ListItemButton>
            </Box>

            {/* Avatar and Username */}
            {!isCollapsed && (
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
            )}

            <Divider sx={{ mb: 2, bgcolor: colors.grey[600] }} />

            {/* Menu */}
            <List disablePadding>
                {menuItems.map((item) => (
                    <SidebarItemComponent
                        key={item.text}
                        item={item}
                        isCollapsed={isCollapsed}
                        navigate={navigate}
                        location={location}
                    />
                ))}
            </List>
        </Box>
    );
};

const SidebarItemComponent = ({
    item,
    isCollapsed,
    navigate,
    location,
}: {
    item: SidebarItemProps;
    isCollapsed: boolean;
    navigate: (path: string) => void;
    location: { pathname: string };
}) => {
    const [expandSubMenu, setExpandSubMenu] = useState(false);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    return (
        <>
            <ListItemButton
                onClick={() => {
                    if (item.subMenu) {
                        setExpandSubMenu(!expandSubMenu);
                    } else {
                        navigate(item.path);
                    }
                }}
                sx={{
                    my: 0.5,
                    borderRadius: "8px",
                    backgroundColor:
                        location.pathname === item.path
                            ? "rgba(0, 0, 0, 0.1)"
                            : "transparent",
                    "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                    },
                }}
            >
                <ListItemIcon sx={{ color: "gray" }}>{item.icon}</ListItemIcon>
                {!isCollapsed && (
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
                )}
                {item.subMenu &&
                    !isCollapsed &&
                    (expandSubMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
            {item.subMenu && (
                <Collapse in={expandSubMenu} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {item.subMenu.map((subItem) => (
                            <ListItemButton
                                key={subItem.text}
                                onClick={() => navigate(subItem.path)}
                                sx={{
                                    pl: 4,
                                    "&:hover": {
                                        backgroundColor: "rgba(0, 0, 0, 0.1)",
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ color: "gray" }}>
                                    {subItem.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography color={colors.grey[100]}>
                                            {subItem.text}
                                        </Typography>
                                    }
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

export default Sidebar;
