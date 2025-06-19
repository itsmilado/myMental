import { useState } from "react";
import {
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    CircularProgress,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { exportTranscription } from "../../auth/api";
import { downloadBlob } from "../../../utils/downloadFile";

type Props = {
    transcriptId: string;
    fileName: string;
};

const formats = [
    { label: "TXT", value: "txt" },
    { label: "PDF", value: "pdf" },
    { label: "DOCX", value: "docx" },
];

export const ExportButton = ({ transcriptId, fileName }: Props) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [loading, setLoading] = useState(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);

    const handleExport = async (format: "txt" | "pdf" | "docx") => {
        setLoading(true);
        handleClose();
        try {
            const { blob, fileName: downloadName } = await exportTranscription(
                transcriptId,
                format
            );
            downloadBlob(blob, downloadName);
        } catch (err) {
            window.alert("Failed to export file.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Tooltip title="Export/download">
                <span>
                    <IconButton onClick={handleClick} disabled={loading}>
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <DownloadIcon />
                        )}
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                {formats.map((f) => (
                    <MenuItem
                        key={f.value}
                        onClick={() => handleExport(f.value as any)}
                    >
                        {f.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
