import { Outlet } from "react-router-dom";
import TopBar from "../components/global/TopBar";
import Sidebar from "../components/global/SideBar";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

const DashboardRoot = styled(Box)(({ theme }) => ({
    minHeight: "100dvh",
    background:
        "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.10), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.08), transparent 45%)",
    ...theme.applyStyles("dark", {
        background:
            "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.18), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.12), transparent 45%)",
    }),
}));

const DashboardMain = styled("main")(({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    color: theme.palette.text.primary,
    backgroundColor: "transparent",
}));

const Dashboard = () => {
    return (
        <DashboardRoot
            display="flex"
            flexDirection="column"
            height="100vh"
            sx={{ overflow: "auto" }}
        >
            <CssBaseline enableColorScheme />
            <TopBar />
            <Box display="flex" flexGrow={1} minWidth={0}>
                <Sidebar />
                <DashboardMain>
                    <Outlet />
                </DashboardMain>
            </Box>
        </DashboardRoot>
    );
};
export default Dashboard;
