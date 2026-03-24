import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    AppBar,
    Box,
    Button,
    Container,
    Stack,
    Toolbar,
    Typography,
    useScrollTrigger,
} from "@mui/material";
import { styled } from "@mui/material/styles";

import ColorModeSelect from "../../../components/shared-theme/ColorModeSelect";
import { SitemarkIcon } from "../../../components/CustomIcons";

type PublicTopBarLink = {
    label: string;
    to?: string;
    onClick?: () => void;
};

type PublicTopBarProps = {
    brandTo?: string;
    brandOnClick?: () => void;
    brandAriaLabel?: string;
    links?: PublicTopBarLink[];
    primaryAction?: {
        label: string;
        to: string;
    };
    secondaryAction?: {
        label: string;
        to: string;
    };
};

const FrostedAppBar = styled(AppBar)(({ theme }) => ({
    backgroundColor: "transparent",
    boxShadow: "none",
    borderBottom: "1px solid transparent",
    color: theme.palette.text.primary,
    transition: "background-color 200ms ease, border-color 200ms ease",
    "&.scrolled": {
        backgroundColor: "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    ...theme.applyStyles("dark", {
        "&.scrolled": {
            backgroundColor: "rgba(11, 17, 32, 0.72)",
            borderBottom: `1px solid ${theme.palette.divider}`,
        },
    }),
}));

const PublicTopBar: React.FC<PublicTopBarProps> = ({
    brandTo = "/",
    brandOnClick,
    brandAriaLabel = "Go to home",
    links = [],
    primaryAction,
    secondaryAction,
}) => {
    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 12,
    });

    const brandProps = brandOnClick
        ? {
              role: "button" as const,
              onClick: brandOnClick,
          }
        : {
              component: RouterLink,
              to: brandTo,
          };

    return (
        <FrostedAppBar position="sticky" className={trigger ? "scrolled" : ""}>
            <Toolbar sx={{ py: 1 }}>
                <Container
                    maxWidth="lg"
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                    <Box
                        {...brandProps}
                        aria-label={brandAriaLabel}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            cursor: "pointer",
                            userSelect: "none",
                            color: "inherit",
                            textDecoration: "none",
                        }}
                    >
                        <SitemarkIcon />
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 800 }}
                        >
                            myMental
                        </Typography>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            ml: { xs: 0, md: 2 },
                            display: { xs: "none", md: "flex" },
                        }}
                    >
                        {links.map((link) =>
                            link.to ? (
                                <Button
                                    key={link.label}
                                    component={RouterLink}
                                    to={link.to}
                                    color="inherit"
                                    sx={{ textTransform: "none" }}
                                >
                                    {link.label}
                                </Button>
                            ) : (
                                <Button
                                    key={link.label}
                                    onClick={link.onClick}
                                    color="inherit"
                                    sx={{ textTransform: "none" }}
                                >
                                    {link.label}
                                </Button>
                            ),
                        )}
                    </Stack>

                    <Box sx={{ flex: 1 }} />

                    <Stack direction="row" spacing={1} alignItems="center">
                        <ColorModeSelect />

                        {secondaryAction ? (
                            <Button
                                component={RouterLink}
                                to={secondaryAction.to}
                                color="inherit"
                                sx={{ textTransform: "none" }}
                            >
                                {secondaryAction.label}
                            </Button>
                        ) : null}

                        {primaryAction ? (
                            <Button
                                component={RouterLink}
                                to={primaryAction.to}
                                variant="contained"
                                sx={{ textTransform: "none" }}
                            >
                                {primaryAction.label}
                            </Button>
                        ) : null}
                    </Stack>
                </Container>
            </Toolbar>
        </FrostedAppBar>
    );
};

export default PublicTopBar;
