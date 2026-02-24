/**
 * useSpeechSynthesis
 *
 * Wraps window.speechSynthesis to read out confirmations (TTS).
 * Returns a speak() function that is a no-op on unsupported browsers.
 */

import { useCallback } from "react";

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  speak: (text: string, lang?: string) => void;
  cancel: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string, lang = "en-US"): void => {
      if (!isSupported) return;
      // Cancel any in-progress utterance first
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const cancel = useCallback((): void => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
  }, [isSupported]);

  return { isSupported, speak, cancel };
}
