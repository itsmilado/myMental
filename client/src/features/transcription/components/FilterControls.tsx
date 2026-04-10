// src/features/transcription/components/FilterControls.tsx

import { useMemo, useState } from "react";
import {
    Box,
    TextField,
    Button,
    Divider,
    FormControlLabel,
    Popover,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

/*
- Shared input styling for transcription history filters
- Keeps offline and online filter controls visually aligned
*/
const buildFilterTextFieldSx = (colors: ReturnType<typeof tokens>) => ({
    "& .MuiInputLabel-root": {
        color: colors.grey[100],
    },
    "& .MuiInputLabel-root.Mui-focused": {
        color: colors.greenAccent[500],
    },
    "& .MuiInputBase-input": {
        color: colors.grey[100],
    },
    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
        borderColor: colors.grey[300],
    },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: colors.grey[200],
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: colors.greenAccent[500],
    },
});

type OfflineFilterControlsProps = {
    project: string;
    projects: string[];
    onProjectApply: (value: string) => void;
};

/*
- Offline history filter controls used by OfflineHistoryPage.
- Inputs: applied Project filter and available Project options.
- Outputs: store updates for text/date filters plus local Project apply events.
- Important behavior: keeps offline controls visually aligned with online controls.
*/
export const OfflineFilterControls = ({
    project,
    projects,
    onProjectApply,
}: OfflineFilterControlsProps) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { filters, setFilters } = useTranscriptionStore();
    const textFieldSx = buildFilterTextFieldSx(colors);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [draftProject, setDraftProject] = useState(project);

    const displayProjects = useMemo(() => {
        const uniqueProjects = Array.from(new Set(projects.filter(Boolean)));
        return ["all", ...uniqueProjects];
    }, [projects]);

    /*
    - Opens the Project filter popover.
    - Syncs the draft selection with the applied value.
    */
    const handleOpenProjectFilter = (
        event: React.MouseEvent<HTMLElement>,
    ): void => {
        setDraftProject(project);
        setAnchorEl(event.currentTarget);
    };

    /*
    - Closes the Project filter popover without applying changes.
    */
    const handleCloseProjectFilter = (): void => {
        setAnchorEl(null);
    };

    /*
    - Applies the selected Project filter and closes the popover.
    */
    const handleApplyProjectFilter = (): void => {
        onProjectApply(draftProject);
        setAnchorEl(null);
    };

    /*
    - Clears store-backed filters and the applied Project selection together.
    - Important behavior: preserves one-click reset parity with online history.
    */
    const handleClearFilters = (): void => {
        setFilters({});
        onProjectApply("all");
        setAnchorEl(null);
    };

    return (
        <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
            <TextField
                label="Date From"
                size="small"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={filters.date_from || ""}
                onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                }
                sx={textFieldSx}
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
                sx={textFieldSx}
            />

            <Button
                variant="outlined"
                size="medium"
                startIcon={<FilterListIcon />}
                onClick={handleOpenProjectFilter}
                sx={{
                    height: 40,
                    minHeight: 40,
                    px: 1.5,
                    color: colors.grey[100],
                    borderColor: colors.grey[300],
                    textTransform: "none",
                    alignSelf: "stretch",
                    "&:hover": {
                        borderColor: colors.grey[200],
                        backgroundColor: theme.palette.action.hover,
                    },
                }}
            >
                {`Project: ${project === "all" ? "All" : project}`}
            </Button>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleCloseProjectFilter}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            px: 1.25,
                            py: 1.25,
                            minWidth: 0,
                            borderRadius: 3,
                        },
                    },
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                    Project
                </Typography>

                <RadioGroup
                    value={draftProject}
                    onChange={(e) => setDraftProject(e.target.value)}
                    sx={{ width: "fit-content" }}
                >
                    {displayProjects.map((option) => (
                        <FormControlLabel
                            key={option}
                            value={option}
                            control={<Radio size="small" />}
                            label={option === "all" ? "All" : option}
                            sx={{ my: 0, mr: 0 }}
                        />
                    ))}
                </RadioGroup>

                <Box display="flex" justifyContent="center" mt={0.75}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleApplyProjectFilter}
                        sx={{ minWidth: 84 }}
                    >
                        Apply
                    </Button>
                </Box>
            </Popover>

            <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: colors.grey[700], mx: 0.5 }}
            />

            <TextField
                label="File Name"
                size="small"
                value={filters.file_name || ""}
                onChange={(e) =>
                    setFilters({ ...filters, file_name: e.target.value })
                }
                sx={{
                    minWidth: 220,
                    ...textFieldSx,
                }}
            />

            <TextField
                label="Search transcript ID"
                size="small"
                value={filters.transcript_id || ""}
                onChange={(e) =>
                    setFilters({ ...filters, transcript_id: e.target.value })
                }
                sx={{
                    minWidth: 260,
                    ...textFieldSx,
                }}
                slotProps={{
                    input: {
                        endAdornment: filters.transcript_id ? (
                            <Button
                                size="small"
                                onClick={() =>
                                    setFilters({
                                        ...filters,
                                        transcript_id: "",
                                    })
                                }
                                sx={{ minWidth: "auto", px: 1 }}
                            >
                                <ClearIcon fontSize="small" />
                            </Button>
                        ) : null,
                    },
                }}
            />

            <Button
                variant="outlined"
                onClick={handleClearFilters}
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

type OnlineFilterControlsProps = {
    dateFrom: string;
    dateTo: string;
    searchId: string;
    project: string;
    projects: string[];
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onSearchIdChange: (value: string) => void;
    onProjectApply: (value: string) => void;
    onClearSearchId: () => void;
};

/*
- Online history filter controls used by OnlineHistoryPage
- Supports date range, Project radio menu, and transcript ID search
*/
export const OnlineFilterControls = ({
    dateFrom,
    dateTo,
    searchId,
    project,
    projects,
    onDateFromChange,
    onDateToChange,
    onSearchIdChange,
    onProjectApply,
    onClearSearchId,
}: OnlineFilterControlsProps) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const textFieldSx = buildFilterTextFieldSx(colors);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [draftProject, setDraftProject] = useState(project);

    const displayProjects = useMemo(() => {
        const uniqueProjects = Array.from(new Set(projects.filter(Boolean)));
        return ["all", ...uniqueProjects];
    }, [projects]);

    /*
    - Opens the Project filter popover
    - Syncs the draft selection with the applied value
    */
    const handleOpenProjectFilter = (
        event: React.MouseEvent<HTMLElement>,
    ): void => {
        setDraftProject(project);
        setAnchorEl(event.currentTarget);
    };

    /*
    - Closes the Project filter popover without applying changes
    */
    const handleCloseProjectFilter = (): void => {
        setAnchorEl(null);
    };

    /*
    - Applies the selected Project filter and closes the popover
    */
    const handleApplyProjectFilter = (): void => {
        onProjectApply(draftProject);
        setAnchorEl(null);
    };

    return (
        <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
            <TextField
                label="Date From"
                size="small"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                sx={textFieldSx}
            />

            <TextField
                label="Date To"
                size="small"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                sx={textFieldSx}
            />

            <Button
                variant="outlined"
                size="medium"
                startIcon={<FilterListIcon />}
                onClick={handleOpenProjectFilter}
                sx={{
                    height: 40,
                    minHeight: 40,
                    px: 1.5,
                    color: colors.grey[100],
                    borderColor: colors.grey[300],
                    textTransform: "none",
                    alignSelf: "stretch",
                    "&:hover": {
                        borderColor: colors.grey[200],
                        backgroundColor: theme.palette.action.hover,
                    },
                }}
            >
                {`Project: ${project === "all" ? "All" : project}`}
            </Button>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleCloseProjectFilter}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            px: 1.25,
                            py: 1.25,
                            minWidth: 0,
                            borderRadius: 3,
                        },
                    },
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                    Project
                </Typography>

                <RadioGroup
                    value={draftProject}
                    onChange={(e) => setDraftProject(e.target.value)}
                    sx={{ width: "fit-content" }}
                >
                    {displayProjects.map((option) => (
                        <FormControlLabel
                            key={option}
                            value={option}
                            control={<Radio size="small" />}
                            label={option === "all" ? "All" : option}
                            sx={{ my: 0, mr: 0 }}
                        />
                    ))}
                </RadioGroup>

                <Box display="flex" justifyContent="center" mt={0.75}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleApplyProjectFilter}
                        sx={{ minWidth: 84 }}
                    >
                        Apply
                    </Button>
                </Box>
            </Popover>

            <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: colors.grey[700], mx: 0.5 }}
            />

            <TextField
                label="Search transcript ID"
                size="small"
                value={searchId}
                onChange={(e) => onSearchIdChange(e.target.value)}
                sx={{
                    minWidth: 260,
                    ...textFieldSx,
                }}
                slotProps={{
                    input: {
                        endAdornment: searchId ? (
                            <Button
                                size="small"
                                onClick={onClearSearchId}
                                sx={{ minWidth: "auto", px: 1 }}
                            >
                                <ClearIcon fontSize="small" />
                            </Button>
                        ) : null,
                    },
                }}
            />
        </Box>
    );
};

export default OfflineFilterControls;
