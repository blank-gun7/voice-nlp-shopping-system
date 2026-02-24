import { useAppContext } from "../../App";
import { useVoiceAssistant } from "../../hooks/useVoiceAssistant";
import TranscriptDisplay from "./TranscriptDisplay";

export default function VoiceOverlay() {
  const { state, dispatch } = useAppContext();
  const { stopVoice, cancelVoice, isRecording } = useVoiceAssistant();
  const { isVoiceOverlayOpen, voiceState } = state;

  if (!isVoiceOverlayOpen) return null;

  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isConfirmed = voiceState === "confirmed";

  const handleMicPress = async () => {
    if (isListening) {
      await stopVoice();
    }
  };

  const handleClose = () => {
    cancelVoice();
    dispatch({ type: "SET_VOICE_OVERLAY", payload: false });
    dispatch({ type: "SET_VOICE_STATE", payload: "idle" });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white"
        aria-label="Close voice overlay"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col items-center gap-8 px-8">
        {/* Animated mic / state indicator */}
        <div className="relative flex items-center justify-center">
          {isListening && (
            <>
              <span className="absolute w-32 h-32 rounded-full bg-green-400/30 animate-listening-ring" />
              <span className="absolute w-24 h-24 rounded-full bg-green-400/20 animate-listening-ring" style={{ animationDelay: "0.3s" }} />
            </>
          )}

          <button
            onClick={handleMicPress}
            disabled={isProcessing}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
              isListening
                ? "bg-green-500 animate-voice-pulse"
                : isProcessing
                ? "bg-amber-500"
                : isConfirmed
                ? "bg-green-600"
                : "bg-stone-600"
            }`}
          >
            {isProcessing ? (
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : isConfirmed ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : isRecording ? (
              // Stop square
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
              </svg>
            )}
          </button>
        </div>

        {/* Transcript / state text */}
        <TranscriptDisplay />

        {/* Hint text */}
        {isListening && (
          <p className="text-white/50 text-xs text-center mt-2">
            Try: "Add 2 gallons of milk" • "Remove apples" • "What's on my list?"
          </p>
        )}

        {/* Done button after confirmation */}
        {isConfirmed && (
          <button
            onClick={handleClose}
            className="mt-4 px-8 py-2.5 bg-green-500 text-white rounded-full font-medium text-sm hover:bg-green-600 transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
