import { Link } from "react-router-dom";
import { useAppContext } from "../../App";
import ListBadge from "./ListBadge";

export default function TopBar() {
  const { state } = useAppContext();
  const itemCount = state.currentList?.total_items ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 h-14 flex items-center justify-between shadow-sm">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-2xl">🛒</span>
        <span className="text-base font-bold text-stone-800 tracking-tight font-heading">
          FreshCart
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <Link to="/list" className="relative p-2">
          <svg
            className="w-6 h-6 text-stone-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <ListBadge count={itemCount} />
        </Link>
      </div>
    </header>
  );
}
