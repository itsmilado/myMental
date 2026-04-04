// src/features/transcription/pages/OnlineHistoryPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    CircularProgress,
    Typography,
    Alert,
    TextField,
    IconButton,
    InputAdornment,
    Button,
    Divider,
    FormControlLabel,
    Popover,
    Radio,
    RadioGroup,
    Stack,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";

import { useAssemblyTranscriptionList } from "../hooks/useAssemblyTranscriptionList";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";

import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { OnlineTranscription } from "../../../types/types";

import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const OnlineHistoryPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const { loadAssemblyTranscriptions } = useAssemblyTranscriptionList();

    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();

    const [selected, setSelected] = useState<OnlineTranscription | null>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [projectAnchorEl, setProjectAnchorEl] = useState<HTMLElement | null>(
        null,
    );
    const [draftProject, setDraftProject] = useState("all");
    const [appliedProject, setAppliedProject] = useState("all");

    useEffect(() => {
        loadAssemblyTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /*
- Build Project options from loaded AssemblyAI history rows
- Keeps filter values aligned with actually available history data
*/
    const projectOptions = useMemo(() => {
        const labels = Array.from(
            new Set(
                list
                    .map(
                        (item) =>
                            item.assemblyai_connection_label?.trim() ||
                            "Not configured",
                    )
                    .filter(Boolean),
            ),
        );

        return ["all", ...labels];
    }, [list]);

    /*
- Normalize a row date for inclusive date-range filtering
*/
    const getCreatedDateOnly = (value: string): string | null => {
        if (!value) return null;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;

        return date.toISOString().slice(0, 10);
    };

    const filteredList = useMemo(() => {
        const q = (searchId ?? "").trim().toLowerCase();

        return list.filter((t) => {
            const matchesSearch = q
                ? (t.transcript_id ?? "").toLowerCase().includes(q)
                : true;

            const projectLabel =
                t.assemblyai_connection_label?.trim() || "Not configured";
            const matchesProject =
                appliedProject === "all"
                    ? true
                    : projectLabel === appliedProject;

            const createdDate = getCreatedDateOnly(t.created_at);
            const matchesDateFrom = dateFrom
                ? createdDate
                    ? createdDate >= dateFrom
                    : false
                : true;
            const matchesDateTo = dateTo
                ? createdDate
                    ? createdDate <= dateTo
                    : false
                : true;

            return (
                matchesSearch &&
                matchesProject &&
                matchesDateFrom &&
                matchesDateTo
            );
        });
    }, [list, searchId, appliedProject, dateFrom, dateTo]);

    const handleRefresh = async () => {
        await loadAssemblyTranscriptions();
    };

    const handleOpenProjectFilter = (
        event: React.MouseEvent<HTMLElement>,
    ): void => {
        setDraftProject(appliedProject);
        setProjectAnchorEl(event.currentTarget);
    };

    const handleCloseProjectFilter = (): void => {
        setProjectAnchorEl(null);
    };

    const handleApplyProjectFilter = (): void => {
        setAppliedProject(draftProject);
        setProjectAnchorEl(null);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
            }}
        >
            {/* Header */}
            <Box px={2.5} py={2}>
                <Box fontSize={24} fontWeight={600} mb={2}>
                    AssemblyAI History
                </Box>

                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    alignItems={{ xs: "stretch", lg: "center" }}
                    gap={1.5}
                    mb={1}
                >
                    <TextField
                        size="small"
                        label="Date from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        sx={{ width: { xs: "100%", sm: 180 } }}
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />

                    <TextField
                        size="small"
                        label="Date to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        sx={{ width: { xs: "100%", sm: 180 } }}
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FilterListIcon />}
                        onClick={handleOpenProjectFilter}
                        sx={{
                            width: { xs: "100%", sm: "auto" },
                            justifyContent: "space-between",
                            color: colors.grey[100],
                            borderColor: colors.grey[300],
                            "&:hover": {
                                borderColor: colors.grey[200],
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                    >
                        {`Project: ${
                            appliedProject === "all" ? "All" : appliedProject
                        }`}
                    </Button>

                    <Popover
                        open={Boolean(projectAnchorEl)}
                        anchorEl={projectAnchorEl}
                        onClose={handleCloseProjectFilter}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "left",
                        }}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "left",
                        }}
                    >
                        <Box sx={{ p: 2.5, minWidth: 260 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{ mb: 1.5, fontWeight: 700 }}
                            >
                                Project
                            </Typography>

                            <RadioGroup
                                value={draftProject}
                                onChange={(e) =>
                                    setDraftProject(e.target.value)
                                }
                            >
                                {projectOptions.map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        value={option}
                                        control={<Radio size="small" />}
                                        label={
                                            option === "all" ? "All" : option
                                        }
                                    />
                                ))}
                            </RadioGroup>

                            <Box
                                display="flex"
                                justifyContent="flex-end"
                                mt={1}
                            >
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleApplyProjectFilter}
                                >
                                    Apply
                                </Button>
                            </Box>
                        </Box>
                    </Popover>

                    <TextField
                        size="small"
                        placeholder="Search transcript ID"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        sx={{ width: { xs: "100%", lg: 320 } }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {searchId ? (
                                            <IconButton
                                                size="small"
                                                onClick={() => setSearchId("")}
                                            >
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        ) : null}
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                            width: { xs: "100%", sm: "auto" },
                            color: colors.grey[100],
                            borderColor: colors.grey[300],
                            "&:hover": {
                                borderColor: colors.grey[200],
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                    >
                        Refresh
                    </Button>
                </Stack>
            </Box>

            <Divider />

            {/* Content */}
            <Box flex={1} minHeight={0} mt={2}>
                {loading ? (
                    <Box
                        height="100%"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box p={2}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                ) : !filteredList.length ? (
                    <Box
                        height="100%"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Typography variant="body2" color="text.secondary">
                            {searchId ||
                            dateFrom ||
                            dateTo ||
                            appliedProject !== "all"
                                ? "No transcriptions match the current filters."
                                : "No AssemblyAI history found."}
                        </Typography>
                    </Box>
                ) : (
                    <OnlineTranscriptionTable
                        data={filteredList}
                        onDetails={setSelected}
                    />
                )}
            </Box>

            {/* Sidebar */}
            <OnlineTranscriptionSidebar
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};

export default OnlineHistoryPage;
