import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  seeAllHref?: string;
}

export default function SectionHeader({ title, seeAllHref }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-stone-800 font-heading tracking-tight">{title}</h2>
      {seeAllHref && (
        <Link
          to={seeAllHref}
          className="text-sm text-green-600 font-medium hover:text-green-700"
        >
          See all
        </Link>
      )}
    </div>
  );
}
