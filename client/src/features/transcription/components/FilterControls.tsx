// src/features/transcription/components/FilterControls.tsx

import { Box, TextField, Button } from "@mui/material";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const FilterControls = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { filters, setFilters } = useTranscriptionStore();

    return (
        <Box display="flex" gap={2} mb={3}>
            <TextField
                label="File Name"
                size="small"
                value={filters.file_name || ""}
                onChange={(e) =>
                    setFilters({ ...filters, file_name: e.target.value })
                }
                sx={{
                    // label color
                    "& .MuiInputLabel-root": {
                        color: colors.grey[100],
                    },
                    // label color when focused
                    "& .MuiInputLabel-root.Mui-focused": {
                        color: colors.greenAccent[500],
                    },

                    // input text color
                    "& .MuiInputBase-input": {
                        color: colors.grey[100],
                    },

                    // default outline
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[300],
                        },

                    // hover outline
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[200],
                        },

                    // focused outline
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.greenAccent[500],
                        },
                }}
            />
            <TextField
                label="Transcript ID"
                size="small"
                value={filters.transcript_id || ""}
                onChange={(e) =>
                    setFilters({ ...filters, transcript_id: e.target.value })
                }
                sx={{
                    // label color
                    "& .MuiInputLabel-root": {
                        color: colors.grey[100],
                    },
                    // label color when focused
                    "& .MuiInputLabel-root.Mui-focused": {
                        color: colors.greenAccent[500],
                    },

                    // input text color
                    "& .MuiInputBase-input": {
                        color: colors.grey[100],
                    },

                    // default outline
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[300],
                        },

                    // hover outline
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[200],
                        },

                    // focused outline
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.greenAccent[500],
                        },
                }}
            />
            <TextField
                label="Date From"
                size="small"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={filters.date_from || ""}
                onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                }
                sx={{
                    // label color
                    "& .MuiInputLabel-root": {
                        color: colors.grey[100],
                    },
                    // label color when focused
                    "& .MuiInputLabel-root.Mui-focused": {
                        color: colors.greenAccent[500],
                    },

                    // input text color
                    "& .MuiInputBase-input": {
                        color: colors.grey[100],
                    },

                    // default outline
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[300],
                        },

                    // hover outline
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[200],
                        },

                    // focused outline
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.greenAccent[500],
                        },
                }}
            />
            <TextField
                label="Date To"
                size="small"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={filters.date_to || ""}
                onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                }
                sx={{
                    // label color
                    "& .MuiInputLabel-root": {
                        color: colors.grey[100],
                    },
                    // label color when focused
                    "& .MuiInputLabel-root.Mui-focused": {
                        color: colors.greenAccent[500],
                    },

                    // input text color
                    "& .MuiInputBase-input": {
                        color: colors.grey[100],
                    },

                    // default outline
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[300],
                        },

                    // hover outline
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.grey[200],
                        },

                    // focused outline
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            borderColor: colors.greenAccent[500],
                        },
                }}
            />
            <Button
                variant="outlined"
                onClick={() => setFilters({})}
                sx={{
                    color: colors.grey[100],
                    borderColor: colors.grey[300],
                    "&:hover": {
                        borderColor: colors.grey[200],
                        backgroundColor: theme.palette.action.hover,
                    },
                }}
            >
                Clear
            </Button>
        </Box>
    );
};

export default FilterControls;
