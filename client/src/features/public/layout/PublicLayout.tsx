import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { styled } from "@mui/material/styles";

import DocumentTitle from "../../../components/global/DocumentTitle";

import AppTheme from "../../../components/shared-theme/AppTheme";
import PublicTopBar from "../components/PublicTopBar";

const LayoutRoot = styled(Box)(({ theme }) => ({
    minHeight: "100dvh",
    background:
        "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.10), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.08), transparent 45%)",
    ...theme.applyStyles("dark", {
        background:
            "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.18), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.12), transparent 45%)",
    }),
}));

type Props = {
    disableCustomTheme?: boolean;
};

const PublicLayout: React.FC<Props> = (props) => {
    const location = useLocation();

    const isSignIn = location.pathname === "/sign-in";

    const primaryAction = isSignIn
        ? { label: "Create account", to: "/sign-up" }
        : { label: "Sign in", to: "/sign-in" };

    const secondaryAction = { label: "Back to home", to: "/" };

    const routeTitle =
        location.pathname === "/sign-in"
            ? "Sign in"
            : location.pathname === "/sign-up"
              ? "Create account"
              : location.pathname === "/reset-password"
                ? "Reset password"
                : location.pathname === "/oauth/callback"
                  ? "Signing in"
                  : undefined;

    return (
        <AppTheme {...props}>
            <DocumentTitle title={routeTitle} />
            <LayoutRoot>
                <PublicTopBar
                    secondaryAction={secondaryAction}
                    primaryAction={primaryAction}
                />

                <Container
                    maxWidth="lg"
                    sx={{
                        py: { xs: 4, md: 8 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "calc(100dvh - 80px)",
                    }}
                >
                    <Outlet />
                </Container>
            </LayoutRoot>
        </AppTheme>
    );
};

export default PublicLayout;
