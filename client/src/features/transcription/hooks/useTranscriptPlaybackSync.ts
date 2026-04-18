//src/features/transcription/hooks/useTranscriptPlaybackSync.ts

import { useMemo } from "react";
import type {
    NormalizedTranscriptTiming,
    NormalizedTranscriptWord,
    TranscriptUtterance,
} from "../../../types/types";

type UseTranscriptPlaybackSyncArgs = {
    currentTimeSeconds: number;
    timing?: NormalizedTranscriptTiming | null;
};

const PLAYBACK_SYNC_TOLERANCE_MS = 120;

/*
- purpose: find the active timed word for the current playback position
- inputs: normalized word timing array and current playback time in milliseconds
- outputs: active word index or -1 when no word matches
- important behavior: uses a small tolerance window so highlighting stays stable
  around timing boundaries and after manual seeks
*/

const findActiveWordIndex = ({
    words,
    currentTimeMs,
}: {
    words: NormalizedTranscriptWord[] | null;
    currentTimeMs: number;
}): number => {
    if (!Array.isArray(words) || words.length === 0) {
        return -1;
    }

    for (let index = 0; index < words.length; index += 1) {
        const word = words[index];

        if (
            currentTimeMs >= word.start - PLAYBACK_SYNC_TOLERANCE_MS &&
            currentTimeMs < word.end + PLAYBACK_SYNC_TOLERANCE_MS
        ) {
            return index;
        }
    }

    return -1;
};

/*
- purpose: find the active utterance for the current playback position
- inputs: normalized utterance timing array and current playback time in milliseconds
- outputs: active utterance index or -1 when no utterance matches
- important behavior: ignores utterances that do not have both timing bounds so
  speaker highlighting only uses reliable timed blocks
*/

const findActiveUtteranceIndex = ({
    utterances,
    currentTimeMs,
}: {
    utterances: TranscriptUtterance[] | null;
    currentTimeMs: number;
}): number => {
    if (!Array.isArray(utterances) || utterances.length === 0) {
        return -1;
    }

    for (let index = 0; index < utterances.length; index += 1) {
        const utterance = utterances[index];

        if (utterance.start === null || utterance.end === null) {
            continue;
        }

        if (
            currentTimeMs >= utterance.start - PLAYBACK_SYNC_TOLERANCE_MS &&
            currentTimeMs < utterance.end + PLAYBACK_SYNC_TOLERANCE_MS
        ) {
            return index;
        }
    }

    return -1;
};

/*
- purpose: resolve playback-synced transcript state from the current audio time
- inputs: current playback time in seconds and normalized transcript timing data
- outputs: active timing state for word and utterance highlighting
- important behavior: converts seconds to milliseconds once and keeps all lookup
  logic centralized so transcript renderers stay presentation-focused
*/

export const useTranscriptPlaybackSync = ({
    currentTimeSeconds,
    timing,
}: UseTranscriptPlaybackSyncArgs) => {
    return useMemo(() => {
        const safeTimeSeconds =
            Number.isFinite(currentTimeSeconds) && currentTimeSeconds > 0
                ? currentTimeSeconds
                : 0;

        const currentTimeMs = Math.round(safeTimeSeconds * 1000);

        const words = timing?.words ?? null;
        const utterances = timing?.utterances ?? null;

        const activeWordIndex = findActiveWordIndex({
            words,
            currentTimeMs,
        });

        const activeUtteranceIndex = findActiveUtteranceIndex({
            utterances,
            currentTimeMs,
        });

        return {
            currentTimeMs,
            activeWordIndex,
            activeUtteranceIndex,
            hasWordTiming: Array.isArray(words) && words.length > 0,
            hasUtteranceTiming:
                Array.isArray(utterances) && utterances.length > 0,
        };
    }, [currentTimeSeconds, timing]);
};
