import { useAppContext } from "../../App";

export default function TranscriptDisplay() {
  const { state } = useAppContext();
  const { interimTranscript, voiceResult, voiceState } = state;

  if (voiceState === "confirmed" && voiceResult) {
    return (
      <div className="text-center px-6 space-y-2">
        <p className="text-stone-500 text-sm">I heard:</p>
        <p className="text-stone-800 font-medium text-base">
          "{voiceResult.transcript}"
        </p>
        <p
          className={`text-sm font-semibold ${
            voiceResult.action_result.status === "success"
              ? "text-green-600"
              : "text-stone-500"
          }`}
        >
          {voiceResult.action_result.message}
        </p>
      </div>
    );
  }

  if (interimTranscript) {
    return (
      <div className="text-center px-6">
        <p className="text-stone-400 text-sm italic">"{interimTranscript}"</p>
      </div>
    );
  }

  if (voiceState === "listening") {
    return (
      <p className="text-stone-400 text-sm text-center">
        Listening… speak your command
      </p>
    );
  }

  if (voiceState === "processing") {
    return (
      <p className="text-stone-400 text-sm text-center">Processing…</p>
    );
  }

  if (voiceState === "error") {
    return (
      <p className="text-red-400 text-sm text-center">
        Something went wrong — tap the mic to try again
      </p>
    );
  }

  return (
    <p className="text-stone-400 text-sm text-center">
      Tap the mic and speak
    </p>
  );
}
