import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVoiceAssistant } from "../../hooks/useVoiceAssistant";
import { useAppContext } from "../../App";

interface SearchVoiceBarProps {
  placeholder?: string;
  defaultValue?: string;
}

export default function SearchVoiceBar({
  placeholder = "Search groceries…",
  defaultValue = "",
}: SearchVoiceBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const navigate = useNavigate();
  const { startVoice } = useVoiceAssistant();
  const { state } = useAppContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/category/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isVoiceActive =
    state.voiceState === "listening" || state.voiceState === "processing";

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
        />
      </div>

      {/* Voice button */}
      <button
        type="button"
        onClick={startVoice}
        disabled={isVoiceActive}
        aria-label="Voice search"
        className={`p-2.5 rounded-xl transition-colors ${
          isVoiceActive
            ? "bg-green-500 text-white animate-voice-pulse"
            : "bg-stone-100 text-stone-600 hover:bg-green-50 hover:text-green-600"
        }`}
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
      </button>
    </form>
  );
}
