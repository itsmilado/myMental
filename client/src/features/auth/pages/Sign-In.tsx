// src/features/auth/pages/Sign-In.tsx

import { FormEvent, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    Link,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import ForgotPassword from "./ForgotPassword";
import { GoogleIcon } from "../../../components/CustomIcons";
import { useAuthStore } from "../../../store/useAuthStore";
import { loginUser, startGoogleOAuth } from "../api";
import { appSectionCardSx } from "../../styles/surfaces";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export default function SignIn() {
    const navigate = useNavigate();

    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [email, setEmail] = useState(user?.email ?? "");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(
        null,
    );
    const [formError, setFormError] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [openForgot, setOpenForgot] = useState(false);

    useEffect(() => {
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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
            setUser(response.userData);
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            setFormError(err.message || "Sign-in failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <Card
            variant="outlined"
            sx={(theme) => ({
                ...appSectionCardSx(theme),
                width: "100%",
                maxWidth: 480,
            })}
        >
            <Stack spacing={2.5}>
                <Stack spacing={1}>
                    <Chip
                        label="Private by design"
                        size="small"
                        sx={{ alignSelf: "flex-start" }}
                    />
                    <Typography
                        component="h1"
                        variant="h4"
                        sx={{
                            fontSize: "clamp(1.9rem, 6vw, 2.25rem)",
                            lineHeight: 1.1,
                        }}
                    >
                        Sign in
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                    >
                        Pick up where you left off and continue in your secure
                        dashboard.
                    </Typography>
                </Stack>

                {formError && (
                    <Alert severity="error" variant="outlined">
                        {formError}
                    </Alert>
                )}

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
                        label="Keep me signed in"
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
                        sx={{ py: 1.2 }}
                    >
                        {loading ? <CircularProgress size={22} /> : "Sign in"}
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

                <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => startGoogleOAuth()}
                    startIcon={<GoogleIcon />}
                    sx={{ py: 1.1 }}
                >
                    Sign in with Google
                </Button>

                <Typography variant="body2" sx={{ textAlign: "center" }}>
                    Don&apos;t have an account?{" "}
                    <Link
                        component={RouterLink}
                        to="/sign-up"
                        underline="hover"
                    >
                        Create one
                    </Link>
                </Typography>
            </Stack>
        </Card>
    );
}
