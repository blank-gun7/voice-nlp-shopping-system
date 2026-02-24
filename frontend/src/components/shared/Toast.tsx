import { useEffect } from "react";
import { useAppContext } from "../../App";

const AUTO_DISMISS_MS = 3000;

export default function Toast() {
  const { state, dispatch } = useAppContext();
  const { toast } = state;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => dispatch({ type: "SET_TOAST", payload: null }),
      AUTO_DISMISS_MS,
    );
    return () => clearTimeout(timer);
  }, [toast, dispatch]);

  if (!toast) return null;

  const colorMap = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-toast-in">
      <div
        className={`${colorMap[toast.type]} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium max-w-xs text-center`}
      >
        {toast.message}
      </div>
    </div>
  );
}
