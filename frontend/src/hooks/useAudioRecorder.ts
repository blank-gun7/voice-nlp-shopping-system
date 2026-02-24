/**
 * useAudioRecorder
 *
 * Manages browser MediaRecorder lifecycle.
 * - Requests mic permission once on first call to startRecording().
 * - Collects audio chunks from MediaRecorder's ondataavailable.
 * - On stop, assembles a single Blob (audio/webm;codecs=opus).
 * - Exposes recording state so UI can react (VoiceButton pulsing, etc.).
 */

import { useCallback, useRef, useState, type MutableRefObject } from "react";

// Preferred MIME type; falls back gracefully on Safari/Firefox.
const PREFERRED_MIME = "audio/webm;codecs=opus";
const FALLBACK_MIME = "audio/webm";

// Silence detection constants
const SILENCE_THRESHOLD = 0.015; // RMS below this = silence
const SILENCE_TIMEOUT_MS = 3000; // Auto-stop after 3s of silence
const MAX_RECORDING_MS = 15000; // Safety net: max 15s recording
const SILENCE_CHECK_INTERVAL_MS = 200;

function getSupportedMimeType(): string {
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported(FALLBACK_MIME)) return FALLBACK_MIME;
  return ""; // Let the browser pick
}

export type RecorderState = "idle" | "recording" | "processing";

export interface UseAudioRecorderReturn {
  recorderState: RecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  onSilenceRef: MutableRefObject<(() => void) | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Promise resolver so stopRecording() can await the final ondataavailable flush.
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Silence detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSilenceRef = useRef<(() => void) | null>(null);

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    cleanupSilenceDetection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [cleanupSilenceDetection]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (recorderState !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob =
          chunksRef.current.length > 0
            ? new Blob(chunksRef.current, {
                type: recorder.mimeType || FALLBACK_MIME,
              })
            : null;
        stopStream();
        resolveStopRef.current?.(blob);
        resolveStopRef.current = null;
        setRecorderState("idle");
      };

      recorder.onerror = () => {
        stopStream();
        resolveStopRef.current?.(null);
        resolveStopRef.current = null;
        setRecorderState("idle");
      };

      // Collect chunks every 250 ms so we don't lose data if stop() fires late.
      recorder.start(250);
      setRecorderState("recording");

      // ── Silence detection via AnalyserNode ────────────────────────────────
      try {
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const dataArray = new Float32Array(analyser.fftSize);
        let hasSpoken = false;
        let silenceStart: number | null = null;

        silenceIntervalRef.current = setInterval(() => {
          analyser.getFloatTimeDomainData(dataArray);
          // Compute RMS volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);

          if (rms > SILENCE_THRESHOLD) {
            hasSpoken = true;
            silenceStart = null;
          } else if (hasSpoken) {
            if (silenceStart === null) {
              silenceStart = Date.now();
            } else if (Date.now() - silenceStart >= SILENCE_TIMEOUT_MS) {
              onSilenceRef.current?.();
            }
          }
        }, SILENCE_CHECK_INTERVAL_MS);

        // Max recording safety net
        maxTimeoutRef.current = setTimeout(() => {
          onSilenceRef.current?.();
        }, MAX_RECORDING_MS);
      } catch {
        // AudioContext not supported — silence detection disabled, manual stop still works
      }
    } catch (err) {
      stopStream();
      setRecorderState("idle");
      throw err; // Let the caller surface a permission-denied message.
    }
  }, [recorderState, stopStream]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null);
    }
    setRecorderState("processing");
    return new Promise<Blob | null>((resolve) => {
      resolveStopRef.current = resolve;
      recorder.stop(); // triggers onstop → resolves the promise
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // Override the resolve so onstop returns null (discarded).
      resolveStopRef.current = () => undefined;
      recorder.stop();
    }
    stopStream();
    setRecorderState("idle");
  }, [stopStream]);

  return { recorderState, startRecording, stopRecording, cancelRecording, onSilenceRef };
}
