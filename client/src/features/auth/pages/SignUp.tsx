// src/features/auth/pages/SignUp.tsx

import * as React from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
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

import AppTheme from "../../../components/shared-theme/AppTheme";
import ColorModeSelect from "../../../components/shared-theme/ColorModeSelect";
import { GoogleIcon, SitemarkIcon } from "../../../components/CustomIcons";
import { useAuthStore } from "../../../store/useAuthStore";
import { signupUser } from "../api";

const Card = styled(MuiCard)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignSelf: "center",
    width: "100%",
    margin: "auto",
    gap: theme.spacing(2),
    borderRadius: 16,
    padding: theme.spacing(2),
    [theme.breakpoints.up("sm")]: {
        maxWidth: 520,
        padding: theme.spacing(4),
    },
    boxShadow:
        "hsla(220, 30%, 5%, 0.06) 0px 6px 18px 0px, hsla(220, 25%, 10%, 0.06) 0px 18px 40px -10px",
    ...theme.applyStyles("dark", {
        boxShadow:
            "hsla(220, 30%, 5%, 0.55) 0px 6px 18px 0px, hsla(220, 25%, 10%, 0.12) 0px 18px 40px -10px",
    }),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
    height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
    minHeight: "100%",
    padding: theme.spacing(2),
    position: "relative",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
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
            "radial-gradient(ellipse at 50% 35%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
        backgroundRepeat: "no-repeat",
        ...theme.applyStyles("dark", {
            backgroundImage:
                "radial-gradient(ellipse at 50% 35%, hsla(210, 100%, 18%, 0.55), hsl(220, 30%, 5%))",
        }),
    },
}));

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

type Props = { disableCustomTheme?: boolean };

const SignUp: React.FC<Props> = (props) => {
    const navigate = useNavigate();

    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [email, setEmail] = React.useState(user?.email ?? "");
    const [password, setPassword] = React.useState("");
    const [repeatPassword, setRepeatPassword] = React.useState("");
    const [allowExtraEmails, setAllowExtraEmails] = React.useState(false);

    const [firstNameError, setFirstNameError] = React.useState<string | null>(
        null,
    );
    const [lastNameError, setLastNameError] = React.useState<string | null>(
        null,
    );
    const [emailError, setEmailError] = React.useState<string | null>(null);
    const [passwordError, setPasswordError] = React.useState<string | null>(
        null,
    );
    const [repeatPasswordError, setRepeatPasswordError] = React.useState<
        string | null
    >(null);
    const [formError, setFormError] = React.useState<string | null>(null);

    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (user) navigate("/dashboard", { replace: true });
    }, [user, navigate]);

    const validate = () => {
        let ok = true;

        const fn = firstName.trim();
        const ln = lastName.trim();
        const em = email.trim();

        if (!fn) {
            setFirstNameError("First name is required.");
            ok = false;
        } else setFirstNameError(null);

        if (!ln) {
            setLastNameError("Last name is required.");
            ok = false;
        } else setLastNameError(null);

        if (!em || !isValidEmail(em)) {
            setEmailError("Please enter a valid email address.");
            ok = false;
        } else setEmailError(null);

        if (!password || password.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            ok = false;
        } else setPasswordError(null);

        if (!repeatPassword) {
            setRepeatPasswordError("Please repeat your password.");
            ok = false;
        } else if (repeatPassword !== password) {
            setRepeatPasswordError("Passwords do not match.");
            ok = false;
        } else setRepeatPasswordError(null);

        return ok;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        if (!validate()) return;

        setLoading(true);
        try {
            const res = await signupUser(
                firstName.trim(),
                lastName.trim(),
                email.trim(),
                password,
                repeatPassword,
            );

            if (!res?.success) {
                setFormError(res?.message || "Sign up failed.");
                setLoading(false);
                return;
            }

            // Signup creates session; set store user and go dashboard
            if (res.userData) {
                setUser(res.userData);
                navigate("/dashboard", { replace: true });
                return;
            }

            navigate("/", { replace: true });
        } catch (err: any) {
            setFormError(
                err?.response?.data?.message ||
                    "Sign up failed. Please try again.",
            );
            setLoading(false);
        }
    };

    const goToSignIn = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate("/sign-in", { replace: true });
    };

    return (
        <AppTheme {...props}>
            <CssBaseline enableColorScheme />
            <SignUpContainer direction="column" justifyContent="space-between">
                <ColorModeSelect
                    sx={{ position: "fixed", top: "1rem", right: "1rem" }}
                />

                <Card variant="outlined">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <SitemarkIcon />
                        <Typography
                            variant="subtitle2"
                            sx={{ color: "text.secondary" }}
                        >
                            myMental
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                        }}
                    >
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{
                                fontSize: "clamp(1.75rem, 6vw, 2.15rem)",
                                lineHeight: 1.15,
                            }}
                        >
                            Create your account
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: "text.secondary" }}
                        >
                            Start organizing tasks, notes, and wellness
                            workflows in one place.
                        </Typography>
                    </Box>

                    {formError && <Alert severity="error">{formError}</Alert>}

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <FormControl>
                            <FormLabel sx={{ mb: 1 }}>Name</FormLabel>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: "1fr 1fr",
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    value={firstName}
                                    onChange={(e) => {
                                        setFirstName(e.target.value);
                                        if (firstNameError)
                                            setFirstNameError(null);
                                        if (formError) setFormError(null);
                                    }}
                                    id="first_name"
                                    name="first_name"
                                    label="First name"
                                    autoComplete="given-name"
                                    required
                                    fullWidth
                                    error={Boolean(firstNameError)}
                                    helperText={firstNameError || " "}
                                />

                                <TextField
                                    value={lastName}
                                    onChange={(e) => {
                                        setLastName(e.target.value);
                                        if (lastNameError)
                                            setLastNameError(null);
                                        if (formError) setFormError(null);
                                    }}
                                    id="last_name"
                                    name="last_name"
                                    label="Last name"
                                    autoComplete="family-name"
                                    required
                                    fullWidth
                                    error={Boolean(lastNameError)}
                                    helperText={lastNameError || " "}
                                />
                            </Box>
                        </FormControl>

                        <FormControl>
                            <FormLabel htmlFor="email">Email</FormLabel>
                            <TextField
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError(null);
                                    if (formError) setFormError(null);
                                }}
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                required
                                fullWidth
                                error={Boolean(emailError)}
                                helperText={emailError || " "}
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
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                required
                                fullWidth
                                error={Boolean(passwordError)}
                                helperText={passwordError || " "}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel htmlFor="repeat_password">
                                Confirm password
                            </FormLabel>
                            <TextField
                                value={repeatPassword}
                                onChange={(e) => {
                                    setRepeatPassword(e.target.value);
                                    if (repeatPasswordError)
                                        setRepeatPasswordError(null);
                                    if (formError) setFormError(null);
                                }}
                                id="repeat_password"
                                name="repeat_password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Repeat your password"
                                required
                                fullWidth
                                error={Boolean(repeatPasswordError)}
                                helperText={repeatPasswordError || " "}
                            />
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allowExtraEmails}
                                    onChange={(e) =>
                                        setAllowExtraEmails(e.target.checked)
                                    }
                                    value="allowExtraEmails"
                                />
                            }
                            label="Send me occasional product updates via email."
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ py: 1.2 }}
                        >
                            {loading ? (
                                <CircularProgress size={22} />
                            ) : (
                                "Create account"
                            )}
                        </Button>

                        <Typography
                            variant="caption"
                            sx={{
                                color: "text.secondary",
                                textAlign: "center",
                            }}
                        >
                            By continuing, you agree to the Terms and Privacy
                            Policy.
                        </Typography>
                    </Box>

                    <Divider>
                        <Typography sx={{ color: "text.secondary" }}>
                            or
                        </Typography>
                    </Divider>

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                        }}
                    >
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => alert("Google OAuth not wired yet")}
                            startIcon={<GoogleIcon />}
                            sx={{ py: 1.1 }}
                        >
                            Continue with Google
                        </Button>

                        <Typography
                            sx={{ textAlign: "center" }}
                            variant="body2"
                        >
                            Already have an account?{" "}
                            <Link
                                href="/sign-in"
                                onClick={goToSignIn}
                                variant="body2"
                            >
                                Sign in
                            </Link>
                        </Typography>
                    </Box>
                </Card>
            </SignUpContainer>
        </AppTheme>
    );
};

export default SignUp;
