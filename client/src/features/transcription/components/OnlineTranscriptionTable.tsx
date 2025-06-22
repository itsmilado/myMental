// src/features/transcription/components/OnlineTranscriptionTable.tsx

import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Tooltip,
    Box,
    Link,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { OnlineTranscription } from "../../../types/types";

type Props = {
    data: OnlineTranscription[];
    onDetails: (t: OnlineTranscription) => void;
};

export const OnlineTranscriptionTable = ({ data, onDetails }: Props) => {
    const handleIdCopy = (id: string) => {
        navigator.clipboard.writeText(id);
    };

    const handleUrlCopy = (url: string) => {
        navigator.clipboard.writeText(url);
    };

    if (!data.length) {
        return <Box p={2}>No online transcriptions found.</Box>;
    }

    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Transcript ID</TableCell>
                    <TableCell>Audio Length</TableCell>
                    <TableCell>Audio URL</TableCell>
                    <TableCell align="center">Details</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((t) => (
                    <TableRow key={t.transcript_id} hover>
                        <TableCell>
                            {new Date(t.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{t.status}</TableCell>
                        <TableCell>
                            <Box display="flex" alignItems="center">
                                {t.transcript_id}
                                <Tooltip title="Copy Transcript ID">
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            handleIdCopy(t.transcript_id)
                                        }
                                        sx={{ ml: 1 }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </TableCell>
                        <TableCell>{t.audio_duration || "-"}</TableCell>
                        <TableCell>
                            <Link
                                href={t.audio_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                            >
                                {t.audio_url}
                            </Link>
                            <Tooltip title="Copy Audio URL">
                                <IconButton
                                    size="small"
                                    onClick={() => handleUrlCopy(t.audio_url)}
                                    sx={{ ml: 1 }}
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                            <IconButton
                                size="small"
                                onClick={() => onDetails(t)}
                                aria-label="Show details"
                            >
                                <ChevronRightIcon />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};
