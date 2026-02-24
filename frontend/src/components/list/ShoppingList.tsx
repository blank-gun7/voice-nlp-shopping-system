import { useAppContext } from "../../App";
import CategoryGroup from "./CategoryGroup";
import EmptyListState from "./EmptyListState";
import SkeletonLoader from "../shared/SkeletonLoader";

export default function ShoppingList() {
  const { state } = useAppContext();
  const { currentList, isListLoading } = state;

  if (isListLoading) {
    return <SkeletonLoader variant="row" count={4} className="px-4 pt-4" />;
  }

  if (!currentList || currentList.total_items === 0) {
    return <EmptyListState />;
  }

  const checkedCount = currentList.checked_items;
  const totalCount = currentList.total_items;

  return (
    <div>
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex justify-between text-xs text-stone-500 mb-1.5">
            <span>{checkedCount} of {totalCount} items checked</span>
            <span>{Math.round((checkedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Category groups */}
      <div className="px-4 pb-4">
        {currentList.categories.map((group) => (
          <CategoryGroup key={group.category} group={group} />
        ))}
      </div>
    </div>
  );
}
