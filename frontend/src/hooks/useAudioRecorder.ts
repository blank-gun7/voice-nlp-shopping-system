/**
 * useAudioRecorder
 *
 * Manages browser MediaRecorder lifecycle.
 * - Requests mic permission once on first call to startRecording().
 * - Collects audio chunks from MediaRecorder's ondataavailable.
 * - On stop, assembles a single Blob (audio/webm;codecs=opus).
 * - Exposes recording state so UI can react (VoiceButton pulsing, etc.).
 */

import { useCallback, useRef, useState } from "react";

// Preferred MIME type; falls back gracefully on Safari/Firefox.
const PREFERRED_MIME = "audio/webm;codecs=opus";
const FALLBACK_MIME = "audio/webm";

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
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Promise resolver so stopRecording() can await the final ondataavailable flush.
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

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

  return { recorderState, startRecording, stopRecording, cancelRecording };
}
