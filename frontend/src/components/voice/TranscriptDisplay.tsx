import { useAppContext } from "../../App";
import { api } from "../../services/api";
import { getStoredListId } from "../../hooks/useVoiceAssistant";
import type { SuggestionItem } from "../../types";

export default function TranscriptDisplay() {
  const { state, dispatch } = useAppContext();
  const { interimTranscript, voiceResult, voiceState } = state;

  const handleAddSuggestion = async (name: string) => {
    const listId = getStoredListId();
    if (!listId) return;
    try {
      await api.addItem(listId, { item_name: name, added_via: "suggestion" });
      const updated = await api.getList(listId);
      dispatch({ type: "SET_LIST", payload: updated });
      dispatch({
        type: "SET_TOAST",
        payload: { message: `Added ${name}`, type: "success" },
      });
    } catch {
      dispatch({
        type: "SET_TOAST",
        payload: { message: `Could not add ${name}`, type: "error" },
      });
    }
  };

  if (voiceState === "confirmed" && voiceResult) {
    const catalogMatches: SuggestionItem[] =
      voiceResult.suggestions?.catalog_matches ?? [];

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
              : voiceResult.action_result.status === "no_change"
              ? "text-amber-600"
              : "text-stone-500"
          }`}
        >
          {voiceResult.action_result.message}
        </p>
        {catalogMatches.length > 0 && (
          <div className="pt-3 space-y-1.5">
            <p className="text-stone-400 text-xs">
              {voiceResult.action_result.status === "no_change"
                ? "Did you mean one of these?"
                : "Did you also mean?"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {catalogMatches.slice(0, 6).map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleAddSuggestion(item.name)}
                  className="px-3 py-1.5 bg-white/90 border border-stone-200 rounded-full text-xs text-stone-700 hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
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
