import { useAppContext } from "../../App";
import { useVoiceAssistant } from "../../hooks/useVoiceAssistant";

export default function VoiceButton() {
  const { state } = useAppContext();
  const { startVoice, stopVoice, isRecording } = useVoiceAssistant();
  const { voiceState } = state;

  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isActive = isListening || isProcessing;

  const handlePress = async () => {
    if (isListening) {
      await stopVoice();
    } else if (!isProcessing) {
      await startVoice();
    }
  };

  return (
    <button
      onClick={handlePress}
      aria-label={isListening ? "Stop recording" : "Start voice command"}
      disabled={isProcessing}
      className={`relative flex flex-col items-center gap-0.5 focus:outline-none ${
        isProcessing ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {/* Pulse ring during listening */}
      {isListening && (
        <span className="absolute inset-0 rounded-full animate-listening-ring bg-green-400 opacity-50" />
      )}

      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${
          isActive
            ? "bg-green-500 animate-voice-pulse"
            : "bg-green-500 hover:bg-green-600 active:scale-95"
        }`}
      >
        {isRecording ? (
          // Stop icon
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Mic icon
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8"
            />
          </svg>
        )}
      </div>

      <span className="text-[10px] font-medium text-stone-500">
        {isListening ? "Tap to stop" : isProcessing ? "Processing" : "Voice"}
      </span>
    </button>
  );
}
