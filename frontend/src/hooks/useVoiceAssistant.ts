/**
 * useVoiceAssistant
 *
 * Orchestrates the full voice pipeline:
 *   startVoice → (MediaRecorder + WebSpeech interim) → stopVoice
 *   → api.voiceCommand → dispatch result to AppContext
 */

import { useEffect, useRef } from "react";
import { useAppContext } from "../App";
import { api } from "../services/api";
import { useAudioRecorder } from "./useAudioRecorder";
import { useWebSpeechFallback } from "./useWebSpeechFallback";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

const LIST_STORAGE_KEY = "vsa_list_id";

export function getStoredListId(): number | null {
  const raw = localStorage.getItem(LIST_STORAGE_KEY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? null : parsed;
}

export function setStoredListId(id: number): void {
  localStorage.setItem(LIST_STORAGE_KEY, String(id));
}

export interface UseVoiceAssistantReturn {
  startVoice: () => Promise<void>;
  stopVoice: () => Promise<void>;
  cancelVoice: () => void;
  isRecording: boolean;
  isProcessing: boolean;
}

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const { state, dispatch } = useAppContext();
  const { recorderState, startRecording, stopRecording, cancelRecording, onSilenceRef } =
    useAudioRecorder();
  const { isSupported, interimTranscript, startListening, stopListening } =
    useWebSpeechFallback();
  const { speak } = useSpeechSynthesis();

  // Mirror interim transcript into global state for VoiceOverlay display
  useEffect(() => {
    if (interimTranscript) {
      dispatch({ type: "SET_INTERIM_TRANSCRIPT", payload: interimTranscript });
    }
  }, [interimTranscript, dispatch]);

  const startVoice = async (): Promise<void> => {
    dispatch({ type: "SET_VOICE_STATE", payload: "listening" });
    dispatch({ type: "SET_VOICE_OVERLAY", payload: true });
    dispatch({ type: "SET_INTERIM_TRANSCRIPT", payload: "" });
    dispatch({ type: "SET_VOICE_RESULT", payload: null });

    if (isSupported) startListening(state.language);

    try {
      await startRecording();
    } catch {
      dispatch({ type: "SET_VOICE_STATE", payload: "error" });
      dispatch({
        type: "SET_TOAST",
        payload: { message: "Microphone access denied", type: "error" },
      });
    }
  };

  const stopVoice = async (): Promise<void> => {
    if (isSupported) stopListening();
    dispatch({ type: "SET_VOICE_STATE", payload: "processing" });

    const audioBlob = await stopRecording();
    if (!audioBlob) {
      dispatch({ type: "SET_VOICE_STATE", payload: "error" });
      dispatch({
        type: "SET_TOAST",
        payload: { message: "No audio captured", type: "error" },
      });
      return;
    }

    try {
      const result = await api.voiceCommand(audioBlob, getStoredListId() ?? undefined);
      dispatch({ type: "SET_VOICE_RESULT", payload: result });
      dispatch({ type: "SET_LIST", payload: result.updated_list });
      dispatch({ type: "SET_VOICE_STATE", payload: "confirmed" });

      if (state.ttsEnabled && result.action_result.message) {
        speak(result.action_result.message);
      }

      dispatch({
        type: "SET_TOAST",
        payload: {
          message: result.action_result.message ?? "Done!",
          type: result.action_result.status === "error" ? "error" : "success",
        },
      });
    } catch {
      dispatch({ type: "SET_VOICE_STATE", payload: "error" });
      dispatch({
        type: "SET_TOAST",
        payload: { message: "Could not understand — please try again", type: "error" },
      });
    }
  };

  // Keep a stable ref to stopVoice to avoid stale closures in silence callback
  const stopVoiceRef = useRef(stopVoice);
  useEffect(() => {
    stopVoiceRef.current = stopVoice;
  });

  // Wire silence auto-stop when recording starts
  useEffect(() => {
    if (recorderState === "recording") {
      onSilenceRef.current = () => stopVoiceRef.current();
    }
    return () => {
      onSilenceRef.current = null;
    };
  }, [recorderState, onSilenceRef]);

  const cancelVoice = (): void => {
    if (isSupported) stopListening();
    cancelRecording();
    dispatch({ type: "SET_VOICE_STATE", payload: "idle" });
    dispatch({ type: "SET_VOICE_OVERLAY", payload: false });
    dispatch({ type: "SET_INTERIM_TRANSCRIPT", payload: "" });
  };

  return {
    startVoice,
    stopVoice,
    cancelVoice,
    isRecording: recorderState === "recording",
    isProcessing: recorderState === "processing",
  };
}
