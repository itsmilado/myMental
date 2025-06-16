// src/features/transcription/components/FilterControls.tsx

import { Box, TextField, Button } from "@mui/material";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";

const FilterControls = () => {
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
            />
            <TextField
                label="Transcript ID"
                size="small"
                value={filters.transcript_id || ""}
                onChange={(e) =>
                    setFilters({ ...filters, transcript_id: e.target.value })
                }
            />
            <TextField
                label="Date From"
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from || ""}
                onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                }
            />
            <TextField
                label="Date To"
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.date_to || ""}
                onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                }
            />
            <Button variant="outlined" onClick={() => setFilters({})}>
                Clear
            </Button>
        </Box>
    );
};

export default FilterControls;
