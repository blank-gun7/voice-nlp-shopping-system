import { NavLink } from "react-router-dom";
import { useAppContext } from "../../App";
import VoiceButton from "../voice/VoiceButton";
import ListBadge from "./ListBadge";

export default function BottomNav() {
  const { state } = useAppContext();
  const itemCount = state.currentList?.total_items ?? 0;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors ${
      isActive ? "text-green-600" : "text-stone-500 hover:text-stone-700"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 flex items-center justify-around safe-bottom"
      style={{ height: "var(--bottom-nav-height)" }}
    >
      <NavLink to="/" end className={linkClass}>
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 21V12h6v9"
          />
        </svg>
        <span>Home</span>
      </NavLink>

      {/* Voice button in the centre */}
      <VoiceButton />

      <NavLink to="/list" className={linkClass}>
        <div className="relative">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <ListBadge count={itemCount} />
        </div>
        <span>My List</span>
      </NavLink>
    </nav>
  );
}
