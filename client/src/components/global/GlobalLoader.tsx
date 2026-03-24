//src/components/global/GlobalLoader.tsx

import { Box, CircularProgress, Stack, Typography } from "@mui/material";

type GlobalLoaderProps = {
    label?: string;
    minHeight?: string | number;
};

const GlobalLoader = ({
    label = "Loading...",
    minHeight = "40vh",
}: GlobalLoaderProps) => {
    return (
        <Box
            sx={{
                width: "100%",
                minHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 3,
            }}
        >
            <Stack spacing={2} alignItems="center">
                <CircularProgress size={32} />
                {label ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center" }}
                    >
                        {label}
                    </Typography>
                ) : null}
            </Stack>
        </Box>
    );
};

export default GlobalLoader;
