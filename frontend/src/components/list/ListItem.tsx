import type { ListItem as ListItemType } from "../../types";
import { useShoppingList } from "../../hooks/useShoppingList";
import SwipeToDelete from "../shared/SwipeToDelete";
import QuantityStepper from "./QuantityStepper";

interface ListItemProps {
  item: ListItemType;
}

export default function ListItem({ item }: ListItemProps) {
  const { updateItem, removeItem } = useShoppingList();

  const handleCheck = () => {
    updateItem(item.id, { is_checked: !item.is_checked });
  };

  const handleIncrement = () => {
    updateItem(item.id, { quantity: item.quantity + 1 });
  };

  const handleDecrement = () => {
    if (item.quantity <= 1) {
      removeItem(item.id);
    } else {
      updateItem(item.id, { quantity: item.quantity - 1 });
    }
  };

  const handleDelete = () => {
    removeItem(item.id);
  };

  return (
    <SwipeToDelete onDelete={handleDelete}>
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white transition-opacity ${
          item.is_checked ? "opacity-50" : ""
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={handleCheck}
          aria-label={item.is_checked ? "Uncheck item" : "Check item"}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            item.is_checked
              ? "bg-green-500 border-green-500"
              : "border-stone-300 hover:border-green-400"
          }`}
        >
          {item.is_checked && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Item name */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium capitalize truncate ${
              item.is_checked ? "line-through text-stone-400" : "text-stone-800"
            }`}
          >
            {item.item_name}
          </p>
          {item.added_via === "voice" && (
            <span className="text-[10px] text-stone-400">via voice</span>
          )}
        </div>

        {/* Quantity stepper */}
        <QuantityStepper
          quantity={item.quantity}
          unit={item.unit}
          onDecrement={handleDecrement}
          onIncrement={handleIncrement}
        />
      </div>
    </SwipeToDelete>
  );
}
