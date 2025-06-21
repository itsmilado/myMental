// /features/transcription/components/OnlineTranscriptionTable.tsx

import * as React from "react";
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Tooltip,
    Box,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { OnlineTranscription } from "../../../types/types";

type Props = {
    data: OnlineTranscription[];
    onDetails: (transcription: OnlineTranscription) => void;
};

export const OnlineTranscriptionTable: React.FC<Props> = ({
    data,
    onDetails,
}) => {
    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
    };

    return (
        <Box>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Transcript ID</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Audio URL</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((t) => (
                        <TableRow hover key={t.transcript_id}>
                            <TableCell>{t.created_at}</TableCell>
                            <TableCell>{t.status}</TableCell>
                            <TableCell>
                                {t.transcript_id}
                                <Tooltip title="Copy Transcript ID">
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            handleCopy(t.transcript_id)
                                        }
                                        sx={{ ml: 1 }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                            <TableCell>{t.project || "-"}</TableCell>
                            <TableCell>
                                <a
                                    href={t.audio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Audio
                                </a>
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
        </Box>
    );
};
