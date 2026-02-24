import { useState } from "react";
import { useShoppingList } from "../hooks/useShoppingList";
import { useVoiceContext } from "../App";
import { useAppContext } from "../App";
import { getStoredListId } from "../hooks/useVoiceAssistant";
import { api } from "../services/api";
import { recordPurchase } from "../services/preferences";
import ShoppingList from "../components/list/ShoppingList";

export default function MyListPage() {
  useShoppingList();
  const { startVoice } = useVoiceContext();
  const { state, dispatch } = useAppContext();
  const { currentList } = state;
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const totalItems = currentList?.total_items ?? 0;
  const checkedItems = currentList?.checked_items ?? 0;

  const allItems = currentList?.categories.flatMap((c) => c.items) ?? [];

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    const listId = getStoredListId();
    if (!listId) {
      setIsPlacing(false);
      setShowConfirm(false);
      return;
    }

    // Record preferences before clearing
    recordPurchase(allItems);

    try {
      // Clear all items in one API call
      await api.clearList(listId);

      // Refresh list to reflect empty state
      const updated = await api.getList(listId);
      dispatch({ type: "SET_LIST", payload: updated });

      dispatch({
        type: "SET_TOAST",
        payload: { message: "Order placed! Your list is on its way 🎉", type: "success" },
      });
    } catch {
      dispatch({
        type: "SET_TOAST",
        payload: { message: "Could not place order — please try again", type: "error" },
      });
    } finally {
      setIsPlacing(false);
      setShowConfirm(false);
    }
  };

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

      {/* Sticky Place Order footer */}
      {totalItems > 0 && (
        <div className="fixed bottom-[var(--bottom-nav-height)] left-0 right-0 px-4 pb-3 pt-2 bg-gradient-to-t from-stone-100 via-stone-100 to-transparent z-20">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl shadow-lg hover:bg-green-600 active:scale-95 transition-all text-sm"
          >
            Place Order ({totalItems} {totalItems === 1 ? "item" : "items"})
          </button>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-stone-800 mb-1 text-center">
              Confirm Order
            </h2>
            <p className="text-sm text-stone-500 text-center mb-6">
              This will place your order for all {totalItems} {totalItems === 1 ? "item" : "items"} and clear your list.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-60"
              >
                {isPlacing ? "Placing…" : "Confirm Order"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 text-stone-500 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
