// src/features/landing/pages/LandingPage.tsx

import * as React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    CssBaseline,
    Divider,
    Link,
    Stack,
    Typography,
    Grid,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import AppTheme from "../../../components/shared-theme/AppTheme";
import { SitemarkIcon } from "../../../components/CustomIcons";
import PublicTopBar from "../../public/components/PublicTopBar";

type RevealProps = React.PropsWithChildren<{ delayMs?: number }>;

const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Reveal = ({ children, delayMs = 0 }: RevealProps) => {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <Box
            ref={ref}
            sx={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
                transition: `opacity 600ms ease ${delayMs}ms, transform 600ms ease ${delayMs}ms`,
            }}
        >
            {children}
        </Box>
    );
};

const PageRoot = styled(Box)(({ theme }) => ({
    minHeight: "100dvh",
    background:
        "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.10), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.08), transparent 45%)",
    ...theme.applyStyles("dark", {
        background:
            "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.18), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.12), transparent 45%)",
    }),
}));

const HeroMock = styled(Box)(({ theme }) => ({
    width: "100%",
    borderRadius: 20,
    border: `1px solid ${theme.palette.divider}`,
    background:
        "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.55))",
    boxShadow:
        "hsla(220, 30%, 5%, 0.08) 0px 10px 30px -12px, hsla(220, 25%, 10%, 0.06) 0px 20px 40px -20px",
    overflow: "hidden",
    ...theme.applyStyles("dark", {
        background:
            "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.55))",
        boxShadow:
            "hsla(220, 30%, 2%, 0.55) 0px 10px 30px -12px, hsla(220, 25%, 4%, 0.28) 0px 20px 40px -20px",
    }),
}));

const SectionTitle = ({
    eyebrow,
    title,
    subtitle,
}: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
}) => {
    return (
        <Stack spacing={1} sx={{ mb: { xs: 2, md: 3 } }}>
            {eyebrow ? (
                <Typography
                    variant="overline"
                    sx={{ letterSpacing: 1.2, opacity: 0.8 }}
                >
                    {eyebrow}
                </Typography>
            ) : null}
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
                {title}
            </Typography>
            {subtitle ? (
                <Typography
                    variant="body1"
                    sx={{ opacity: 0.85, maxWidth: 760 }}
                >
                    {subtitle}
                </Typography>
            ) : null}
        </Stack>
    );
};

const Hero = () => {
    const navigate = useNavigate();

    return (
        <Box id="top" sx={{ pt: { xs: 5, md: 8 }, pb: { xs: 2, md: 2 } }}>
            <Container maxWidth="lg">
                <Grid container spacing={4} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Reveal>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 950,
                                    letterSpacing: -0.6,
                                    lineHeight: 1.05,
                                    fontSize: { xs: 40, sm: 52, md: 56 },
                                }}
                            >
                                Private by design.
                                <br />
                                Useful by default.
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{ mt: 2, opacity: 0.85, maxWidth: 560 }}
                            >
                                Notes, tasks, documents, and appointments in one
                                secure workspace. No ads. No tracking. Full
                                control.
                            </Typography>

                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1.5}
                                sx={{ mt: 3 }}
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => navigate("/sign-up")}
                                    sx={{
                                        borderRadius: 999,
                                        textTransform: "none",
                                    }}
                                >
                                    Create account
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => navigate("/")}
                                    sx={{
                                        borderRadius: 999,
                                        textTransform: "none",
                                    }}
                                >
                                    Sign in
                                </Button>
                            </Stack>

                            <Typography
                                variant="body2"
                                sx={{ mt: 2, opacity: 0.7 }}
                            >
                                You own your data. The product stays
                                predictable.
                            </Typography>
                        </Reveal>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Reveal delayMs={120}>
                            <HeroMock aria-label="Product preview mock">
                                <Box sx={{ p: 2.5 }}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ mb: 2 }}
                                    >
                                        <Box
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 999,
                                                bgcolor:
                                                    "rgba(239, 68, 68, 0.75)",
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 999,
                                                bgcolor:
                                                    "rgba(245, 158, 11, 0.75)",
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 999,
                                                bgcolor:
                                                    "rgba(34, 197, 94, 0.75)",
                                            }}
                                        />
                                        <Typography
                                            variant="caption"
                                            sx={{ ml: 1, opacity: 0.7 }}
                                        >
                                            myMental workspace (preview)
                                        </Typography>
                                    </Stack>

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 7 }}>
                                            <Box
                                                sx={(theme) => ({
                                                    borderRadius: 3,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    p: 2,
                                                })}
                                            >
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 800 }}
                                                >
                                                    Today
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ mt: 1, opacity: 0.8 }}
                                                >
                                                    • Journal: quick reflection
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        mt: 0.5,
                                                        opacity: 0.8,
                                                    }}
                                                >
                                                    • Task: review priorities
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        mt: 0.5,
                                                        opacity: 0.8,
                                                    }}
                                                >
                                                    • Appointment: 15:00
                                                    check-in
                                                </Typography>
                                            </Box>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 5 }}>
                                            <Box
                                                sx={(theme) => ({
                                                    borderRadius: 3,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    p: 2,
                                                    height: "100%",
                                                })}
                                            >
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 800 }}
                                                >
                                                    Notes
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ mt: 1, opacity: 0.8 }}
                                                >
                                                    “Keep it simple. Keep it
                                                    private.”
                                                </Typography>
                                            </Box>
                                        </Grid>

                                        <Grid size={12}>
                                            <Box
                                                sx={(theme) => ({
                                                    borderRadius: 3,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    p: 2,
                                                })}
                                            >
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 800 }}
                                                >
                                                    Document vault
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ mt: 1, opacity: 0.8 }}
                                                >
                                                    Store what matters next to
                                                    the context that matters.
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </HeroMock>
                        </Reveal>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

const TrustStrip = () => {
    return (
        <Reveal delayMs={60}>
            <Container maxWidth="lg">
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                        mt: { xs: 3, md: 2 },
                        mb: { xs: 3, md: 5 },
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    <Chip label="No ads" variant="outlined" />
                    <Chip label="No tracking" variant="outlined" />
                    <Chip label="You own your data" variant="outlined" />
                    <Chip label="Privacy-first by design" variant="outlined" />
                </Stack>
            </Container>
        </Reveal>
    );
};

const ValueProps = () => {
    const items = [
        {
            title: "Private workspace",
            body: "A personal hub for notes, tasks, documents, and appointments — designed for control.",
        },
        {
            title: "Focused productivity",
            body: "A calm interface that reduces cognitive noise and helps you act on what matters.",
        },
        {
            title: "AI on your terms",
            body: "Assistance when you want it, with privacy-conscious architecture and clear boundaries.",
        },
    ];

    return (
        <Box sx={{ py: { xs: 6, md: 9 } }}>
            <Container maxWidth="lg">
                <Reveal>
                    <SectionTitle
                        eyebrow="Principles"
                        title="Built around clarity and control."
                        subtitle="myMental is a privacy-first productivity and mental wellness workspace. It’s designed to be useful without being invasive."
                    />
                </Reveal>

                <Grid container spacing={2}>
                    {items.map((it, idx) => (
                        <Grid key={it.title} size={{ xs: 12, md: 4 }}>
                            <Reveal delayMs={idx * 80}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        height: "100%",
                                        borderRadius: 3,
                                        transition:
                                            "transform 160ms ease, box-shadow 160ms ease",
                                        "&:hover": {
                                            transform: "translateY(-2px)",
                                            boxShadow:
                                                "hsla(220, 30%, 5%, 0.08) 0px 10px 28px -14px",
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 900, mb: 1 }}
                                        >
                                            {it.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ opacity: 0.85 }}
                                        >
                                            {it.body}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Reveal>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

const FeatureGrid = () => {
    const features = [
        {
            title: "Notes & journaling",
            body: "Capture thoughts, reflections, and context with a clean workflow.",
        },
        {
            title: "Tasks & routines",
            body: "Turn intentions into actions with simple, dependable tracking.",
        },
        {
            title: "Appointments & reminders",
            body: "Keep time-bound commitments visible without overwhelm.",
        },
        {
            title: "Document vault",
            body: "Store important files alongside the mental context they belong to.",
        },
        {
            title: "Voice → text",
            body: "Transcribe voice notes for quick capture and structured follow-up.",
        },
        {
            title: "AI workflows (planned)",
            body: "Future-ready architecture for local and privacy-conscious assistance.",
        },
    ];

    return (
        <Box id="features" sx={{ py: { xs: 6, md: 9 } }}>
            <Container maxWidth="lg">
                <Reveal>
                    <SectionTitle
                        eyebrow="Features"
                        title="Everything you need. Nothing you don’t."
                        subtitle="A practical set of tools to organize mental load — built with privacy and usability as defaults."
                    />
                </Reveal>

                <Grid container spacing={2}>
                    {features.map((f, idx) => (
                        <Grid key={f.title} size={{ xs: 12, md: 4 }}>
                            <Reveal delayMs={idx * 60}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        height: "100%",
                                        borderRadius: 3,
                                        transition:
                                            "transform 160ms ease, box-shadow 160ms ease",
                                        "&:hover": {
                                            transform: "translateY(-2px)",
                                            boxShadow:
                                                "hsla(220, 30%, 5%, 0.08) 0px 10px 28px -14px",
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 900 }}
                                        >
                                            {f.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ mt: 1, opacity: 0.85 }}
                                        >
                                            {f.body}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Reveal>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

const PrivacyBlock = () => {
    const bullets = [
        "No ad trackers. No data selling.",
        "Clear control over what you store.",
        "Session-based authentication with predictable behavior.",
        "Security patterns that scale with the project.",
    ];

    return (
        <Box
            id="privacy"
            sx={(theme) => ({
                py: { xs: 7, md: 10 },
                backgroundColor:
                    theme.palette.mode === "dark"
                        ? "rgba(2, 6, 23, 0.85)"
                        : "rgba(15, 23, 42, 0.92)",
                color: "white",
            })}
        >
            <Container maxWidth="lg">
                <Grid container spacing={4} alignItems="center">
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Reveal>
                            <Typography
                                variant="overline"
                                sx={{ letterSpacing: 1.2, opacity: 0.85 }}
                            >
                                Privacy
                            </Typography>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 950,
                                    lineHeight: 1.15,
                                    mt: 1,
                                }}
                            >
                                Privacy-first isn’t a feature. It’s the
                                architecture.
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{ mt: 2, opacity: 0.9 }}
                            >
                                myMental is built to be useful without being
                                invasive. You get a calm workspace for
                                productivity and mental wellness — without
                                trading away your personal data.
                            </Typography>

                            <Stack spacing={1.2} sx={{ mt: 3 }}>
                                {bullets.map((b) => (
                                    <Stack
                                        key={b}
                                        direction="row"
                                        spacing={1.5}
                                        alignItems="flex-start"
                                    >
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                bgcolor:
                                                    "rgba(255,255,255,0.75)",
                                                mt: "8px",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{ opacity: 0.9 }}
                                        >
                                            {b}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Reveal>
                    </Grid>

                    <Grid size={{ xs: 12, md: 5 }}>
                        <Reveal delayMs={120}>
                            <Box
                                sx={{
                                    borderRadius: 4,
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    background:
                                        "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))",
                                    p: 3,
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: 950 }}
                                >
                                    Privacy principles
                                </Typography>
                                <Divider
                                    sx={{
                                        my: 2,
                                        borderColor: "rgba(255,255,255,0.18)",
                                    }}
                                />
                                <Stack spacing={1}>
                                    <Typography
                                        variant="body2"
                                        sx={{ opacity: 0.9 }}
                                    >
                                        Minimal data collection by default.
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ opacity: 0.9 }}
                                    >
                                        Transparent behavior and predictable UX.
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ opacity: 0.9 }}
                                    >
                                        Clear boundaries for AI features.
                                    </Typography>
                                </Stack>
                            </Box>
                        </Reveal>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

const HowItWorks = () => {
    const steps = [
        {
            title: "Create your space",
            body: "Start with a simple account and a calm, distraction-free workspace.",
        },
        {
            title: "Organize what matters",
            body: "Bring notes, tasks, documents, and appointments into one place.",
        },
        {
            title: "Use tools to assist",
            body: "Add automation and AI workflows when they’re helpful — not invasive.",
        },
    ];

    return (
        <Box sx={{ py: { xs: 6, md: 9 } }}>
            <Container maxWidth="lg">
                <Reveal>
                    <SectionTitle
                        eyebrow="How it works"
                        title="A simple flow that reduces mental load."
                        subtitle="Capture, organize, and act — with privacy-first defaults."
                    />
                </Reveal>

                <Grid container spacing={2}>
                    {steps.map((s, idx) => (
                        <Grid key={s.title} size={{ xs: 12, md: 4 }}>
                            <Reveal delayMs={idx * 80}>
                                <Card
                                    variant="outlined"
                                    sx={{ borderRadius: 3, height: "100%" }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography
                                            variant="overline"
                                            sx={{ opacity: 0.75 }}
                                        >
                                            Step {idx + 1}
                                        </Typography>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 950, mt: 0.5 }}
                                        >
                                            {s.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ mt: 1, opacity: 0.85 }}
                                        >
                                            {s.body}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Reveal>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

const FinalCTA = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ py: { xs: 7, md: 10 } }}>
            <Container maxWidth="lg">
                <Reveal>
                    <Card
                        variant="outlined"
                        sx={{
                            borderRadius: 4,
                            p: { xs: 3, md: 5 },
                            textAlign: "center",
                            background:
                                "linear-gradient(180deg, rgba(99,102,241,0.09), rgba(2,132,199,0.05))",
                        }}
                    >
                        <Typography variant="h4" sx={{ fontWeight: 950 }}>
                            Start building a calmer digital space.
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{ mt: 1.5, opacity: 0.85 }}
                        >
                            A private home for your thoughts and plans —
                            designed to stay useful and predictable.
                        </Typography>

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            sx={{ mt: 3, justifyContent: "center" }}
                        >
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => navigate("/sign-up")}
                                sx={{
                                    borderRadius: 999,
                                    textTransform: "none",
                                }}
                            >
                                Create account
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => navigate("/")}
                                sx={{
                                    borderRadius: 999,
                                    textTransform: "none",
                                }}
                            >
                                Sign in
                            </Button>
                        </Stack>

                        <Typography
                            variant="caption"
                            sx={{ display: "block", mt: 2, opacity: 0.75 }}
                        >
                            No ads. No tracking. You own your data.
                        </Typography>
                    </Card>
                </Reveal>
            </Container>
        </Box>
    );
};

const Footer = () => {
    return (
        <Box sx={{ py: 4 }}>
            <Container maxWidth="lg">
                <Divider sx={{ mb: 3 }} />
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        justifyContent: "space-between",
                        alignItems: { sm: "center" },
                    }}
                >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <SitemarkIcon />
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                            myMental
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.65 }}>
                            Privacy-first productivity & mental wellness
                        </Typography>
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{ flexWrap: "wrap" }}
                    >
                        <Link
                            component="button"
                            onClick={() => scrollToId("features")}
                            underline="hover"
                            color="inherit"
                            sx={{ opacity: 0.75 }}
                        >
                            Features
                        </Link>
                        <Link
                            component="button"
                            onClick={() => scrollToId("privacy")}
                            underline="hover"
                            color="inherit"
                            sx={{ opacity: 0.75 }}
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/"
                            underline="hover"
                            color="inherit"
                            sx={{ opacity: 0.75 }}
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/sign-up"
                            underline="hover"
                            color="inherit"
                            sx={{ opacity: 0.75 }}
                        >
                            Create account
                        </Link>
                    </Stack>
                </Stack>

                <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 2, opacity: 0.6 }}
                >
                    © {new Date().getFullYear()} myMental. Built as a
                    privacy-first learning project.
                </Typography>
            </Container>
        </Box>
    );
};

const LandingPage = (props: { disableCustomTheme?: boolean }) => {
    return (
        <AppTheme {...props}>
            <CssBaseline enableColorScheme />
            <PageRoot>
                <PublicTopBar
                    brandOnClick={() => scrollToId("top")}
                    brandAriaLabel="Go to top"
                    links={[
                        {
                            label: "Features",
                            onClick: () => scrollToId("features"),
                        },
                        {
                            label: "Privacy",
                            onClick: () => scrollToId("privacy"),
                        },
                        {
                            label: "How it works",
                            onClick: () => scrollToId("how-it-works"),
                        },
                    ]}
                    secondaryAction={{ label: "Sign in", to: "/sign-in" }}
                    primaryAction={{ label: "Create account", to: "/sign-up" }}
                />
                <Hero />
                <TrustStrip />
                <ValueProps />
                <FeatureGrid />
                <PrivacyBlock />
                <HowItWorks />
                <FinalCTA />
                <Footer />
            </PageRoot>
        </AppTheme>
    );
};

export default LandingPage;
