import { useState } from "react";
import type { CategoryGroup as CategoryGroupData } from "../../types";
import ListItem from "./ListItem";
import CategoryBadge from "../shared/CategoryBadge";

interface CategoryGroupProps {
  group: CategoryGroupData;
}

export default function CategoryGroup({ group }: CategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4">
      {/* Category header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full px-4 py-2"
      >
        <div className="flex items-center gap-2">
          <CategoryBadge category={group.category} />
          <span className="text-xs text-stone-400">{group.count} items</span>
        </div>
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-stone-50">
          {group.items.map((item) => (
            <ListItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
