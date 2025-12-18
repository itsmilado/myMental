import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Slider,
    Tooltip,
    Stack,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Replay10Icon from "@mui/icons-material/Replay10";
import Forward10Icon from "@mui/icons-material/Forward10";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import axios from "axios";

type Props = {
    src: string; // fully qualified URL
    disabled?: boolean;
    disabledMessage?: string;
};

const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
};

export const AudioPlayer = ({ src, disabled, disabledMessage }: Props) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [exists, setExists] = useState<boolean | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const effectiveDisabled = disabled || exists === false;

    const effectiveMessage = useMemo(() => {
        if (disabled && disabledMessage) return disabledMessage;
        if (exists === false) return "Audio file missing or deleted.";
        if (errorMsg) return errorMsg;
        return null;
    }, [disabled, disabledMessage, exists, errorMsg]);

    // Existence check (HEAD). If server doesn’t support HEAD properly, it’ll still
    // typically work because Express handles HEAD for GET routes.
    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            setExists(null);
            setErrorMsg(null);

            try {
                await axios.head(src, { withCredentials: true });
                if (!cancelled) setExists(true);
            } catch (e: any) {
                const status = e?.response?.status;
                if (!cancelled) {
                    setExists(false);
                    if (status && status !== 404) {
                        setErrorMsg("Audio unavailable.");
                    }
                }
            }
        };

        if (disabled) {
            setExists(null);
            return;
        }

        check();

        return () => {
            cancelled = true;
        };
    }, [src, disabled]);

    // Wire audio element events
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;

        const onLoaded = () => {
            setDuration(el.duration || 0);
        };
        const onTime = () => {
            if (!isSeeking) setCurrentTime(el.currentTime || 0);
        };
        const onEnded = () => {
            setIsPlaying(false);
        };
        const onError = () => {
            setIsPlaying(false);
            setErrorMsg("Audio failed to load.");
            setExists(false);
        };

        el.addEventListener("loadedmetadata", onLoaded);
        el.addEventListener("timeupdate", onTime);
        el.addEventListener("ended", onEnded);
        el.addEventListener("error", onError);

        return () => {
            el.removeEventListener("loadedmetadata", onLoaded);
            el.removeEventListener("timeupdate", onTime);
            el.removeEventListener("ended", onEnded);
            el.removeEventListener("error", onError);
        };
    }, [isSeeking]);

    // stop when unmount / src changes
    useEffect(() => {
        const el = audioRef.current;
        return () => {
            if (el) {
                el.pause();
            }
        };
    }, [src]);

    const togglePlay = async () => {
        if (effectiveDisabled) return;
        const el = audioRef.current;
        if (!el) return;

        try {
            if (isPlaying) {
                el.pause();
                setIsPlaying(false);
            } else {
                await el.play();
                setIsPlaying(true);
            }
        } catch {
            setErrorMsg("Playback blocked by browser.");
        }
    };

    const skip = (delta: number) => {
        if (effectiveDisabled) return;
        const el = audioRef.current;
        if (!el) return;
        const next = Math.max(
            0,
            Math.min(el.currentTime + delta, duration || 0)
        );
        el.currentTime = next;
        setCurrentTime(next);
    };

    const toggleMute = () => {
        const el = audioRef.current;
        if (!el) return;
        el.muted = !el.muted;
        setIsMuted(el.muted);
    };

    const remaining = Math.max(0, (duration || 0) - (currentTime || 0));

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 3,
                p: 2,
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={1.25}>
                <Box display="flex" alignItems="center">
                    {/* Centered transport controls */}
                    <Box
                        flex={1}
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        gap={1}
                    >
                        <Tooltip title="Back 10s">
                            <span>
                                <IconButton
                                    onClick={() => skip(-10)}
                                    disabled={effectiveDisabled}
                                    size="small"
                                >
                                    <Replay10Icon />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title={isPlaying ? "Pause" : "Play"}>
                            <span>
                                <IconButton
                                    onClick={togglePlay}
                                    disabled={effectiveDisabled}
                                    size="small"
                                >
                                    {isPlaying ? (
                                        <PauseIcon />
                                    ) : (
                                        <PlayArrowIcon />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Forward 10s">
                            <span>
                                <IconButton
                                    onClick={() => skip(10)}
                                    disabled={effectiveDisabled}
                                    size="small"
                                >
                                    <Forward10Icon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>

                    {/* Right-side mute */}
                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        alignItems="center"
                    >
                        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                            <span>
                                <IconButton
                                    onClick={toggleMute}
                                    disabled={effectiveDisabled}
                                    size="small"
                                >
                                    {isMuted ? (
                                        <VolumeOffIcon />
                                    ) : (
                                        <VolumeUpIcon />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Seek row */}
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="caption" sx={{ minWidth: 52 }}>
                        {formatTime(currentTime)}
                    </Typography>

                    <Slider
                        value={Math.min(currentTime, duration || 0)}
                        min={0}
                        max={Math.max(1, duration || 0)}
                        step={0.25}
                        disabled={effectiveDisabled}
                        onChange={(_, v) => {
                            const next = Array.isArray(v) ? v[0] : v;
                            setIsSeeking(true);
                            setCurrentTime(next);
                        }}
                        onChangeCommitted={(_, v) => {
                            const next = Array.isArray(v) ? v[0] : v;
                            const el = audioRef.current;
                            if (el) el.currentTime = next;
                            setIsSeeking(false);
                        }}
                    />

                    <Typography
                        variant="caption"
                        sx={{ minWidth: 62, textAlign: "right" }}
                    >
                        -{formatTime(remaining)}
                    </Typography>
                </Box>
                {effectiveMessage ? (
                    <Typography
                        variant="caption"
                        color="warning.main"
                        sx={{ textAlign: "center", mt: 0.5 }}
                    >
                        {effectiveMessage}
                    </Typography>
                ) : null}

                {/* hidden audio element */}
                <audio ref={audioRef} src={src} preload="metadata" />
            </Stack>
        </Paper>
    );
};
