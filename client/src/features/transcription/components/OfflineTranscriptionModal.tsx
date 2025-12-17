import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, Snackbar, Alert } from "@mui/material";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { deleteTranscription } from "../../auth/api";
import { TranscriptionDetailContent } from "./TranscriptionDetailContent";

type Props = {
    open: boolean;
    transcription: any | null;
    onClose: () => void;
};

export const OfflineTranscriptionModal = ({
    open,
    transcription,
    onClose,
}: Props) => {
    const { removeTranscriptionFromList, setActive } = useTranscriptionStore();
    const navigate = useNavigate();

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        error?: boolean;
    }>({ open: false, message: "" });

    if (!transcription) return null;

    const handleDelete = async ({
        deleteFromAssembly,
        deleteServerFiles,
    }: {
        deleteFromAssembly: boolean;
        deleteServerFiles: boolean;
        deleteFromDb: boolean;
    }): Promise<string> => {
        try {
            const msg = await deleteTranscription(transcription.id, {
                deleteFromAssembly,
                deleteTxtFile: deleteServerFiles,
                deleteAudioFile: deleteServerFiles,
            });

            removeTranscriptionFromList(transcription.id);

            setSnackbar({
                open: true,
                message: msg || "Deleted",
                error: false,
            });

            setActive(null);
            onClose();
            return msg || "Deleted";
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error?.message || "Delete failed",
                error: true,
            });
            throw error;
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={(_, reason) => {
                    // avoid accidental close on backdrop
                    if (reason === "backdropClick") return;

                    setActive(null);
                    onClose();
                }}
                fullWidth
                maxWidth="md"
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            overflow: "hidden",
                            height: { xs: "92vh", md: "80vh" },
                        },
                    },
                }}
            >
                {/* Ensure the content can fill the dialog height */}
                <div style={{ height: "100%" }}>
                    <TranscriptionDetailContent
                        // mode="modal"
                        transcription={transcription}
                        showActions={true}
                        onBack={() => {
                            setActive(null);
                            onClose();
                        }}
                        onClose={() => {
                            setActive(null);
                            onClose();
                        }}
                        onOpenFullPage={() => {
                            setActive(null);
                            onClose();
                            navigate(
                                `/dashboard/transcriptions/${transcription.id}`
                            );
                        }}
                        onDelete={handleDelete}
                    />
                </div>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.error ? "error" : "success"}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
