import type { Theme } from "@mui/material/styles";

export const appSectionCardSx = (theme: Theme) => ({
    p: { xs: 2, md: 3 },
    borderRadius: "20px",
    background:
        "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.55))",
    border: "1px solid",
    borderColor: "divider",
    boxShadow:
        "hsla(220, 30%, 5%, 0.08) 0px 10px 30px -12px, hsla(220, 25%, 10%, 0.06) 0px 20px 40px -20px",
    backdropFilter: "blur(8px)",
    ...theme.applyStyles("dark", {
        background:
            "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.55))",
        boxShadow:
            "hsla(220, 30%, 2%, 0.55) 0px 10px 30px -12px, hsla(220, 25%, 4%, 0.28) 0px 20px 40px -20px",
    }),
});

export const appDangerCardSx = (theme: Theme) => ({
    ...appSectionCardSx(theme),
    borderColor: theme.palette.error.main,
});

export const appNestedCardSx = (theme: Theme) => ({
    p: 2,
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    background:
        "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.42))",
    transition: "border-color 0.2s ease, background-color 0.2s ease",
    "&:hover": {
        borderColor: "text.secondary",
    },
    ...theme.applyStyles("dark", {
        background:
            "linear-gradient(180deg, rgba(15,23,42,0.72), rgba(15,23,42,0.36))",
    }),
});

export const appDialogPaperSx = (theme: Theme) => ({
    borderRadius: "20px",
    border: "1px solid",
    borderColor: "divider",
    background:
        "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.68))",
    boxShadow:
        "hsla(220, 30%, 5%, 0.12) 0px 18px 44px -18px, hsla(220, 25%, 10%, 0.08) 0px 28px 64px -28px",
    backdropFilter: "blur(12px)",
    overflow: "hidden",
    ...theme.applyStyles("dark", {
        background:
            "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(15,23,42,0.72))",
        boxShadow:
            "hsla(220, 30%, 2%, 0.62) 0px 18px 44px -18px, hsla(220, 25%, 4%, 0.34) 0px 28px 64px -28px",
    }),
});

export const appDialogContentSx = {
    color: "text.primary",
    backgroundColor: "transparent",
};

export const appDialogActionsSx = {
    px: 3,
    pb: 3,
};
