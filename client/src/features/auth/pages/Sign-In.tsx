// src/features/auth/pages/Sign-In.tsx

import * as React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
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
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";

import ForgotPassword from "./ForgotPassword";
import { GoogleIcon } from "../../../components/CustomIcons";
import { useAuthStore } from "../../../store/useAuthStore";
import { loginUser, startGoogleOAuth } from "../api";

const Card = styled(MuiCard)(({ theme }) => ({
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    padding: theme.spacing(3),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow:
        "hsla(220, 30%, 5%, 0.06) 0px 8px 22px 0px, hsla(220, 25%, 10%, 0.06) 0px 24px 44px -12px",
    ...theme.applyStyles("dark", {
        boxShadow:
            "hsla(220, 30%, 5%, 0.45) 0px 8px 22px 0px, hsla(220, 25%, 10%, 0.16) 0px 24px 44px -12px",
    }),
}));

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export default function SignIn() {
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
            setFormError(
                err?.response?.data?.message ||
                    "Sign-in failed. Please try again.",
            );
            setLoading(false);
        }
    };

    return (
        <Card variant="outlined">
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
