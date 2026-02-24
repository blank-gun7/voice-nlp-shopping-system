import { useAppContext } from "../../App";
import { useProductSuggestions } from "../../hooks/useProductSuggestions";
import { useShoppingList } from "../../hooks/useShoppingList";
import ChipButton from "../shared/ChipButton";
import CategoryBadge from "../shared/CategoryBadge";
import { getProductVisual } from "./ProductCard";

export default function ProductSheet() {
  const { state, dispatch } = useAppContext();
  const { selectedProduct, isProductSheetOpen } = state;
  const { suggestions, isLoading } = useProductSuggestions(
    isProductSheetOpen && selectedProduct ? selectedProduct.name : null,
  );
  const { addItem } = useShoppingList();

  if (!isProductSheetOpen || !selectedProduct) return null;

  const visual = getProductVisual(selectedProduct.name, selectedProduct.category);

  const handleClose = () => {
    dispatch({ type: "SET_PRODUCT_SHEET", payload: false });
    dispatch({ type: "SET_SELECTED_PRODUCT", payload: null });
  };

  const handleAddMain = async () => {
    await addItem({ item_name: selectedProduct.name, quantity: 1, category: selectedProduct.category });
    handleClose();
  };

  const handleAddSuggested = async (name: string) => {
    await addItem({ item_name: name, quantity: 1, added_via: "suggestion" });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-sheet-up max-h-[80vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* Product header */}
          <div className="flex items-start gap-4 py-4 border-b border-stone-100">
            <div className={`w-20 h-20 ${visual.bg} rounded-2xl flex items-center justify-center text-4xl flex-shrink-0`}>
              {visual.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-stone-800 capitalize mb-1">
                {selectedProduct.name}
              </h3>
              <CategoryBadge category={selectedProduct.category} />
              {selectedProduct.avg_price && (
                <p className="text-sm text-stone-500 mt-1">
                  ~${selectedProduct.avg_price.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Add to list button */}
          <button
            onClick={handleAddMain}
            className="mt-4 w-full py-3 bg-green-500 text-white font-semibold rounded-2xl hover:bg-green-600 transition-colors text-sm"
          >
            + Add to List
          </button>

          {/* Suggestions */}
          {isLoading && (
            <div className="mt-6 space-y-2">
              <div className="h-4 bg-stone-100 rounded animate-pulse w-32" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-24 bg-stone-100 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {suggestions && (
            <>
              {suggestions.co_purchase.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-stone-700 mb-3">
                    Frequently bought together
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.co_purchase.map((name) => (
                      <ChipButton
                        key={name}
                        label={`+ ${name}`}
                        onClick={() => handleAddSuggested(name)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {suggestions.substitutes.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-stone-700 mb-3">
                    You might also like
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.substitutes.map((name) => (
                      <ChipButton
                        key={name}
                        label={name}
                        onClick={() => handleAddSuggested(name)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
