import { useVoiceContext } from "../../App";

export default function EmptyListState() {
  const { startVoice } = useVoiceContext();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="text-7xl mb-6">🛒</div>
      <h2 className="text-xl font-bold text-stone-700 mb-2">Your list is empty</h2>
      <p className="text-stone-400 text-sm mb-8">
        Use your voice to add items, or tap the mic button below
      </p>
      <button
        onClick={startVoice}
        className="px-6 py-3 bg-green-500 text-white font-semibold rounded-2xl hover:bg-green-600 transition-colors flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
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
        Say "Add milk"
      </button>
    </div>
  );
}
