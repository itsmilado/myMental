// src/features/auth/pages/Sign-in.tsx

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { styled } from "@mui/material/styles";

import ForgotPassword from "./ForgotPassword";
import AppTheme from "../../../components/shared-theme/AppTheme";
import ColorModeSelect from "../../../components/shared-theme/ColorModeSelect";
import { GoogleIcon, SitemarkIcon } from "../../../components/CustomIcons";

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { loginUser } from "../api";

const Card = styled(MuiCard)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignSelf: "center",
    width: "100%",
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: "auto",
    [theme.breakpoints.up("sm")]: {
        maxWidth: "450px",
    },
    boxShadow:
        "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
    ...theme.applyStyles("dark", {
        boxShadow:
            "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
    }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
    height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
    minHeight: "100%",
    padding: theme.spacing(2),
    [theme.breakpoints.up("sm")]: {
        padding: theme.spacing(4),
    },
    "&::before": {
        content: '""',
        display: "block",
        position: "absolute",
        zIndex: -1,
        inset: 0,
        backgroundImage:
            "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
        backgroundRepeat: "no-repeat",
        ...theme.applyStyles("dark", {
            backgroundImage:
                "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
        }),
    },
}));

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export default function SignIn(props: { disableCustomTheme?: boolean }) {
    const navigate = useNavigate();

    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [email, setEmail] = React.useState(user?.email ?? "");
    const [password, setPassword] = React.useState("");

    const [rememberMe, setRememberMe] = React.useState(false);

    const [emailError, setEmailError] = React.useState<string | null>(null);
    const [passwordError, setPasswordError] = React.useState<string | null>(
        null,
    );
    const [formError, setFormError] = React.useState<string | null>(null);

    const [loading, setLoading] = React.useState(false);
    const [openForgot, setOpenForgot] = React.useState(false);

    React.useEffect(() => {
        // If already logged in and the user lands here, send them to dashboard.
        if (user) navigate("/dashboard", { replace: true });
    }, [user, navigate]);

    const validate = (values: { email: string; password: string }) => {
        let ok = true;

        if (!values.email || !isValidEmail(values.email)) {
            setEmailError("Please enter a valid email address.");
            ok = false;
        } else {
            setEmailError(null);
        }

        if (!values.password || values.password.length < 6) {
            setPasswordError("Password must be at least 6 characters long.");
            ok = false;
        } else {
            setPasswordError(null);
        }

        return ok;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        const values = { email: email.trim(), password };
        if (!validate(values)) return;

        setLoading(true);
        try {
            const response = await loginUser(
                values.email,
                values.password,
                rememberMe,
            );

            if (!response?.success || !response.userData) {
                setFormError("Invalid email or password.");
                setLoading(false);
                return;
            }

            setUser(response.userData);
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            // Keep error messaging generic for auth
            setFormError(
                err?.response?.data?.message ||
                    "Sign-in failed. Please try again.",
            );
            setLoading(false);
        }
    };

    return (
        <AppTheme {...props}>
            <CssBaseline enableColorScheme />
            <SignInContainer direction="column" justifyContent="space-between">
                <ColorModeSelect
                    sx={{ position: "fixed", top: "1rem", right: "1rem" }}
                />
                <Card variant="outlined">
                    <SitemarkIcon />
                    <Typography
                        component="h1"
                        variant="h4"
                        sx={{
                            width: "100%",
                            fontSize: "clamp(2rem, 10vw, 2.15rem)",
                        }}
                    >
                        Sign in
                    </Typography>

                    {formError && <Alert severity="error">{formError}</Alert>}

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            gap: 2,
                        }}
                    >
                        <FormControl>
                            <FormLabel htmlFor="email">Email</FormLabel>
                            <TextField
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError(null);
                                    if (formError) setFormError(null);
                                }}
                                error={Boolean(emailError)}
                                helperText={emailError || " "}
                                id="email"
                                type="email"
                                name="email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                autoFocus
                                required
                                fullWidth
                                variant="outlined"
                                color={emailError ? "error" : "primary"}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <TextField
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError(null);
                                    if (formError) setFormError(null);
                                }}
                                error={Boolean(passwordError)}
                                helperText={passwordError || " "}
                                name="password"
                                placeholder="••••••"
                                type="password"
                                id="password"
                                autoComplete="current-password"
                                required
                                fullWidth
                                variant="outlined"
                                color={passwordError ? "error" : "primary"}
                            />
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={rememberMe}
                                    onChange={(e) =>
                                        setRememberMe(e.target.checked)
                                    }
                                    color="primary"
                                />
                            }
                            label="Remember me"
                        />

                        <ForgotPassword
                            open={openForgot}
                            handleClose={() => setOpenForgot(false)}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                        >
                            {loading ? (
                                <CircularProgress size={22} />
                            ) : (
                                "Sign in"
                            )}
                        </Button>

                        <Link
                            component="button"
                            type="button"
                            onClick={() => setOpenForgot(true)}
                            variant="body2"
                            sx={{ alignSelf: "center" }}
                        >
                            Forgot your password?
                        </Link>
                    </Box>

                    <Divider>or</Divider>

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => alert("Google OAuth not wired yet")}
                            startIcon={<GoogleIcon />}
                        >
                            Sign in with Google
                        </Button>
                    </Box>
                </Card>
            </SignInContainer>
        </AppTheme>
    );
}
