import { useState } from "react";
import type { Order } from "../../types";

interface OrderCardProps {
  order: Order;
  index: number;
}

export default function OrderCard({ order, index }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(order.purchased_at);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold text-sm">
            #{index}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              Order #{index}
            </p>
            <p className="text-xs text-stone-400">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-medium rounded-full">
            {order.item_count} {order.item_count === 1 ? "item" : "items"}
          </span>
          <svg
            className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100">
          <div className="mt-3 space-y-2">
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-stone-700">{item.item_name}</span>
                <span className="text-stone-400 text-xs">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
