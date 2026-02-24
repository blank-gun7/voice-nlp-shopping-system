import { useRef, useState, type ReactNode } from "react";

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  /** Pixels to swipe before triggering delete (default 80) */
  threshold?: number;
}

export default function SwipeToDelete({
  children,
  onDelete,
  threshold = 80,
}: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const delta = startXRef.current - e.touches[0].clientX;
    // Only allow leftward swipe
    setOffset(Math.max(0, Math.min(delta, threshold + 20)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    startXRef.current = null;
    if (offset >= threshold) {
      onDelete();
    } else {
      setOffset(0);
    }
  };

  const deleteVisible = offset >= threshold * 0.5;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background revealed on swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-red-500 px-4 rounded-xl transition-opacity"
        style={{ opacity: deleteVisible ? 1 : 0, width: threshold }}
      >
        <span className="text-white text-sm font-medium">Delete</span>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
