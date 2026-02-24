/**
 * useWebSpeechFallback
 *
 * Uses the browser's Web Speech API (SpeechRecognition) to provide
 * real-time *interim* transcripts while MediaRecorder is capturing.
 *
 * Purpose: instant visual feedback ("I heard: add 2 ban...") before
 * the Groq Whisper result arrives (~1-2 s latency).
 *
 * This hook is intentionally lightweight — it is NOT the authoritative
 * transcript. The final transcript always comes from Groq Whisper.
 *
 * Availability: Chrome/Edge (full). Firefox/Safari — will silently
 * return `isSupported=false` so callers can skip interim display.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// TypeScript does not ship SpeechRecognition types by default.
type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};
type SpeechRecognitionErrorEvent = Event & { error: string };

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

// Browser-prefixed constructor union
const SpeechRecognitionCtor: (new () => SpeechRecognitionInstance) | null =
  (typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

export interface UseWebSpeechFallbackReturn {
  /** Whether the browser supports the Web Speech API. */
  isSupported: boolean;
  /** Real-time partial transcript from the Web Speech API. */
  interimTranscript: string;
  startListening: (lang?: string) => void;
  stopListening: () => void;
}

export function useWebSpeechFallback(): UseWebSpeechFallbackReturn {
  const isSupported = SpeechRecognitionCtor !== null;
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startListening = useCallback(
    (lang = "en-US") => {
      if (!isSupported || !SpeechRecognitionCtor) return;

      // Abort any in-flight session before starting a fresh one.
      recognitionRef.current?.abort();

      const rec = new SpeechRecognitionCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (!result.isFinal) {
            interim += result[0].transcript;
          }
        }
        if (interim) setInterimTranscript(interim);
      };

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        // "no-speech" and "aborted" are expected during normal operation.
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Web Speech API error:", e.error);
        }
      };

      rec.onend = () => {
        // Don't restart — the caller controls the lifecycle.
      };

      recognitionRef.current = rec;
      setInterimTranscript("");

      try {
        rec.start();
      } catch {
        // start() throws if called while already running — safe to ignore.
      }
    },
    [isSupported],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  return { isSupported, interimTranscript, startListening, stopListening };
}
