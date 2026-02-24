interface QuantityStepperProps {
  quantity: number;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export default function QuantityStepper({
  quantity,
  unit,
  onDecrement,
  onIncrement,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors text-lg font-bold leading-none"
      >
        −
      </button>
      <span className="min-w-[40px] text-center text-sm font-semibold text-stone-800">
        {quantity} {unit !== "unit" && unit.length <= 4 ? unit : ""}
      </span>
      <button
        onClick={onIncrement}
        aria-label="Increase quantity"
        className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 hover:bg-green-200 transition-colors text-lg font-bold leading-none"
      >
        +
      </button>
    </div>
  );
}
