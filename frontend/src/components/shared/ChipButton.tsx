interface ChipButtonProps {
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export default function ChipButton({
  label,
  onClick,
  active = false,
  className = "",
}: ChipButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-green-500 text-white"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
      } ${className}`}
    >
      {label}
    </button>
  );
}
