import { useShoppingList } from "../hooks/useShoppingList";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { useAppContext } from "../App";
import ShoppingList from "../components/list/ShoppingList";

export default function MyListPage() {
  // Bootstrap the list (creates or fetches from backend on first render)
  useShoppingList();
  const { startVoice } = useVoiceAssistant();
  const { state } = useAppContext();
  const { currentList } = state;

  const totalItems = currentList?.total_items ?? 0;
  const checkedItems = currentList?.checked_items ?? 0;

  return (
    <div className="pb-6">
      {/* Page header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-800">My List</h1>
            {totalItems > 0 && (
              <p className="text-xs text-stone-400 mt-0.5">
                {totalItems - checkedItems} items remaining
              </p>
            )}
          </div>

          {/* Voice add button */}
          <button
            onClick={startVoice}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            <svg
              className="w-4 h-4"
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
            Voice Add
          </button>
        </div>
      </div>

      <ShoppingList />
    </div>
  );
}
