// src/components/global/SideBar.tsx

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
    IconButton,
    Tooltip,
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
    Tune as TuneIcon,
    Upload as UploadIcon,
    History as HistoryIcon,
    Share as ShareIcon,
    Task as TaskIcon,
    Event as EventIcon,
    Alarm as AlarmIcon,
    HolidayVillage as HolidayVillageIcon,
    ChevronLeft,
    ChevronRight,
} from "@mui/icons-material";
import { tokens } from "../../theme/theme";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarItemProps } from "../../types/types";

const Sidebar = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as "light" | "dark");
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const sidebarBackground = theme.palette.background.paper;
    const sidebarBorder = theme.palette.divider;
    const dividerColor = theme.palette.divider;
    const collapseButtonColor = theme.palette.text.primary;
    const collapseButtonBorderColor = theme.palette.divider;
    const collapseButtonHoverBackground = theme.palette.action.hover;
    const profileAvatarText = theme.palette.secondary.contrastText;
    const profileTextColor = theme.palette.text.primary;

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
            ],
        },
        {
            text: "Account",
            icon: <PersonIcon />,
            path: "/dashboard/account",
            subMenu: [
                {
                    text: "Account",
                    path: "/dashboard/account",
                    icon: <PersonIcon />,
                },
                {
                    text: "Preferences",
                    path: "/dashboard/preferences",
                    icon: <TuneIcon />,
                },
            ],
        },
        {
            text: "Transcriptions",
            icon: <ArticleIcon />,
            path: "/dashboard/transcriptions",
            subMenu: [
                {
                    text: "Upload",
                    path: "/dashboard/transcriptions/upload",
                    icon: <UploadIcon />,
                },
                {
                    text: "History",
                    path: "/dashboard/transcriptions/history",
                    icon: <HistoryIcon />,
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
            display="flex"
            position="sticky"
            top={64}
            flexDirection="column"
            bgcolor={sidebarBackground}
            sx={{
                borderRight: `1px solid ${sidebarBorder}`,
                px: 2,
                py: 3,
                height: "calc(100vh - 64px)",
                overflowY: "auto",
                overflowX: "hidden",
                zIndex: 1200,
            }}
        >
            <Box
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
                mb={3}
                sx={{ px: isCollapsed ? 0 : 1 }}
            >
                <Tooltip
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <IconButton
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        size="small"
                        sx={{
                            borderRadius: "999px",
                            border: `1px solid ${collapseButtonBorderColor}`,
                            color: collapseButtonColor,
                            backgroundColor: "transparent",
                            "&:hover": {
                                backgroundColor: collapseButtonHoverBackground,
                            },
                        }}
                    >
                        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                    </IconButton>
                </Tooltip>
            </Box>

            {!isCollapsed && (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    mb={4}
                >
                    <Avatar
                        sx={{
                            width: 64,
                            height: 64,
                            mb: 1,
                            bgcolor: colors.greenAccent[500],
                            color: profileAvatarText,
                        }}
                    />
                    <Typography variant="h5" color={profileTextColor}>
                        User Name
                    </Typography>
                </Box>
            )}

            <Divider sx={{ mb: 2, bgcolor: dividerColor }} />

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

    const isActive =
        location.pathname === item.path ||
        (!!item.subMenu &&
            item.subMenu.some((s) => location.pathname.startsWith(s.path)));

    const activeItemBackground = theme.palette.action.selected;
    const hoverItemBackground = theme.palette.action.hover;

    const itemTextColor = theme.palette.text.primary;
    const itemMutedTextColor = theme.palette.text.secondary;

    const itemIconColor = theme.palette.text.primary;
    const itemActiveIconColor = theme.palette.secondary.main;

    useEffect(() => {
        if (!item.subMenu) return;

        const shouldExpand = item.subMenu.some((s) =>
            location.pathname.startsWith(s.path),
        );

        setExpandSubMenu(shouldExpand);
    }, [item.subMenu, location.pathname]);

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
                    backgroundColor: isActive
                        ? activeItemBackground
                        : "transparent",
                    "&:hover": {
                        backgroundColor: hoverItemBackground,
                    },
                }}
            >
                <ListItemIcon
                    sx={{
                        color: isActive ? itemActiveIconColor : itemIconColor,
                        minWidth: 40,
                    }}
                >
                    {item.icon}
                </ListItemIcon>

                {!isCollapsed && (
                    <ListItemText
                        primary={
                            <Typography
                                color={itemTextColor}
                                fontWeight={isActive ? 700 : 500}
                            >
                                {item.text}
                            </Typography>
                        }
                    />
                )}

                {item.subMenu && !isCollapsed ? (
                    expandSubMenu ? (
                        <ExpandLess sx={{ color: itemMutedTextColor }} />
                    ) : (
                        <ExpandMore sx={{ color: itemMutedTextColor }} />
                    )
                ) : null}
            </ListItemButton>

            {item.subMenu && (
                <Collapse in={expandSubMenu} timeout="auto" unmountOnExit>
                    <List
                        component="div"
                        disablePadding
                        sx={{
                            pl: isCollapsed ? 0 : 2,
                        }}
                    >
                        {item.subMenu.map((subItem) => {
                            const isSubActive =
                                location.pathname === subItem.path;

                            return (
                                <ListItemButton
                                    key={subItem.text}
                                    onClick={() => navigate(subItem.path)}
                                    sx={{
                                        my: 0.25,
                                        justifyContent: isCollapsed
                                            ? "center"
                                            : "flex-start",
                                        borderRadius: "8px",
                                        backgroundColor: isSubActive
                                            ? activeItemBackground
                                            : "transparent",
                                        "&:hover": {
                                            backgroundColor:
                                                hoverItemBackground,
                                        },
                                    }}
                                >
                                    {subItem.icon ? (
                                        <ListItemIcon
                                            sx={{
                                                color: isSubActive
                                                    ? itemActiveIconColor
                                                    : itemMutedTextColor,
                                                minWidth: isCollapsed ? 0 : 36,
                                                justifyContent: "center",
                                            }}
                                        >
                                            {subItem.icon}
                                        </ListItemIcon>
                                    ) : null}
                                    {!isCollapsed && (
                                        <ListItemText
                                            primary={
                                                <Typography
                                                    color={
                                                        isSubActive
                                                            ? itemTextColor
                                                            : itemMutedTextColor
                                                    }
                                                    fontSize={14}
                                                    fontWeight={
                                                        isSubActive ? 700 : 500
                                                    }
                                                >
                                                    {subItem.text}
                                                </Typography>
                                            }
                                        />
                                    )}
                                </ListItemButton>
                            );
                        })}
                    </List>
                </Collapse>
            )}
        </>
    );
};

export default Sidebar;
