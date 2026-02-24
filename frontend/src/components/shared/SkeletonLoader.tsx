interface SkeletonLoaderProps {
  variant?: "card" | "row" | "text" | "circle";
  count?: number;
  className?: string;
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded-lg ${className}`} />
  );
}

export default function SkeletonLoader({
  variant = "card",
  count = 1,
  className = "",
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (variant === "card") {
    return (
      <div className={`flex gap-3 overflow-hidden ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36">
            <SkeletonBlock className="w-36 h-36 mb-2" />
            <SkeletonBlock className="w-24 h-3 mb-1" />
            <SkeletonBlock className="w-16 h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl">
            <SkeletonBlock className="w-10 h-10 flex-shrink-0" />
            <div className="flex-1">
              <SkeletonBlock className="w-32 h-3 mb-2" />
              <SkeletonBlock className="w-20 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((_, i) => (
          <SkeletonBlock key={i} className="w-full h-4" />
        ))}
      </div>
    );
  }

  // circle
  return (
    <div className={`flex gap-2 ${className}`}>
      {items.map((_, i) => (
        <SkeletonBlock key={i} className="w-12 h-12 rounded-full" />
      ))}
    </div>
  );
}
