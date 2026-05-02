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
import { useLocation, useNavigate } from "react-router-dom";
import { alpha, styled } from "@mui/material/styles";
import { SidebarItemProps } from "../../types/types";

const StyledSideBar = styled(Box, {
    shouldForwardProp: (prop) => prop !== "isCollapsed",
})<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
    width: isCollapsed ? "80px" : "260px",
    display: "flex",
    position: "sticky",
    top: 64,
    flexDirection: "column",
    borderRight: `1px solid ${theme.palette.divider}`,
    background: "transparent",
    backdropFilter: "blur(12px)",
    boxShadow: "hsla(220, 30%, 5%, 0.06) 0px 10px 30px -18px",
    padding: theme.spacing(3, 2),
    height: "calc(100vh - 64px)",
    overflowY: "auto",
    overflowX: "hidden",
    zIndex: 1200,
    transition:
        "width 180ms ease, background-color 200ms ease, border-color 200ms ease",
    ...theme.applyStyles("dark", {
        background: "transparent",
        boxShadow: "hsla(220, 30%, 2%, 0.46) 0px 10px 30px -18px",
    }),
}));

const Sidebar = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

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
        <StyledSideBar isCollapsed={isCollapsed}>
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
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: alpha(
                                theme.palette.background.paper,
                                theme.palette.mode === "dark" ? 0.36 : 0.64,
                            ),
                            "&:hover": {
                                backgroundColor: theme.palette.action.hover,
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
                        }}
                    />
                    <Typography variant="h5">User Name</Typography>
                </Box>
            )}

            <Divider sx={{ mb: 2, bgcolor: `${theme.palette.divider}` }} />

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
        </StyledSideBar>
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

    const activeItemBackground =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.primary.main, 0.18)
            : alpha(theme.palette.primary.main, 0.1);
    const hoverItemBackground =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.primary.main, 0.12)
            : alpha(theme.palette.primary.main, 0.08);
    const itemIconColor = theme.palette.text.secondary;
    const itemActiveIconColor = theme.palette.primary.main;

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
                    color: isActive ? "text.primary" : "text.secondary",
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
                            <Typography fontWeight={isActive ? 700 : 500}>
                                {item.text}
                            </Typography>
                        }
                    />
                )}

                {item.subMenu && !isCollapsed ? (
                    expandSubMenu ? (
                        <ExpandLess />
                    ) : (
                        <ExpandMore />
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
                                        color: isSubActive
                                            ? "text.primary"
                                            : "text.secondary",
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
