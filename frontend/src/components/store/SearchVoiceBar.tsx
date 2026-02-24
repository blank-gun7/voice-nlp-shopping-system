import { useState, useRef, useCallback } from "react";
import { useAppContext, useVoiceContext } from "../../App";
import { api } from "../../services/api";
import type { Product } from "../../types";

interface SearchVoiceBarProps {
  placeholder?: string;
}

export default function SearchVoiceBar({
  placeholder = "Search groceries…",
}: SearchVoiceBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { dispatch, state } = useAppContext();
  const { startVoice } = useVoiceContext();

  const isVoiceActive =
    state.voiceState === "listening" || state.voiceState === "processing";

  const openProduct = (product: Product) => {
    dispatch({ type: "SET_SELECTED_PRODUCT", payload: product });
    dispatch({ type: "SET_PRODUCT_SHEET", payload: true });
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setIsOpen(false);
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.search(value.trim());
        setResults(response.results.slice(0, 8));
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleBlur = () => {
    // Slight delay so click on result fires first
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      setResults([]);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="flex-1 relative">
        {/* Search icon */}
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

        {/* Spinner while searching */}
        {isSearching && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}

        <input
          type="search"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-9 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
        />

        {/* Dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-100 z-30 overflow-hidden">
            {results.map((product) => (
              <button
                key={product.name_lower}
                onMouseDown={() => openProduct(product)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left transition-colors"
              >
                <span className="text-lg">
                  {/* Inline minimal emoji for speed — no import needed */}
                  {product.category === "produce"
                    ? "🥦"
                    : product.category === "dairy"
                    ? "🥛"
                    : product.category === "meat"
                    ? "🥩"
                    : product.category === "bakery"
                    ? "🍞"
                    : product.category === "beverages"
                    ? "🧃"
                    : product.category === "snacks"
                    ? "🍿"
                    : product.category === "frozen"
                    ? "🧊"
                    : "🛒"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 capitalize truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-stone-400 capitalize">{product.category}</p>
                </div>
                {product.avg_price && (
                  <span className="text-xs text-stone-500 flex-shrink-0">
                    ${product.avg_price.toFixed(2)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice button */}
      <button
        type="button"
        onClick={startVoice}
        disabled={isVoiceActive}
        aria-label="Voice search"
        className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
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
    </div>
  );
}
