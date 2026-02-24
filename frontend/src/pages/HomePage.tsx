import { useHomeData } from "../hooks/useHomeData";
import { useShoppingList } from "../hooks/useShoppingList";
import { getFrequentItems } from "../services/preferences";
import SearchVoiceBar from "../components/store/SearchVoiceBar";
import SectionHeader from "../components/store/SectionHeader";
import ProductCardRow from "../components/store/ProductCardRow";
import CategoryGrid from "../components/store/CategoryGrid";
import ChipButton from "../components/shared/ChipButton";
import SkeletonLoader from "../components/shared/SkeletonLoader";

export default function HomePage() {
  const { homeData, isLoading } = useHomeData();
  const { addItem } = useShoppingList();
  const usualItems = getFrequentItems(8);

  return (
    <div className="px-4 pt-4 pb-6 space-y-6">
      {/* Search + voice bar */}
      <SearchVoiceBar placeholder="Search 3,000+ items…" />

      {/* Seasonal picks */}
      <section>
        <SectionHeader title="🌿 Seasonal Picks" />
        {isLoading ? (
          <SkeletonLoader variant="card" count={4} />
        ) : (
          <ProductCardRow products={homeData?.seasonal ?? []} />
        )}
      </section>

      {/* Popular this week */}
      <section>
        <SectionHeader title="🔥 Popular This Week" />
        {isLoading ? (
          <SkeletonLoader variant="card" count={4} />
        ) : (
          <ProductCardRow products={homeData?.popular ?? []} />
        )}
      </section>

      {/* Your Usuals — derived from local purchase history */}
      {usualItems.length > 0 && (
        <section>
          <SectionHeader title="⭐ Your Usuals" />
          <div className="flex flex-wrap gap-2">
            {usualItems.map((name) => (
              <ChipButton
                key={name}
                label={`+ ${name}`}
                onClick={() =>
                  addItem({ item_name: name, quantity: 1, added_via: "suggestion" })
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Reorder suggestions */}
      {(homeData?.reorder?.length ?? 0) > 0 && (
        <section>
          <SectionHeader title="🔁 Buy Again" />
          <div className="flex flex-wrap gap-2">
            {homeData!.reorder.map((item) => (
              <ChipButton
                key={item.name}
                label={`+ ${item.name}`}
                onClick={() =>
                  addItem({ item_name: item.name, quantity: 1, added_via: "suggestion" })
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Category grid */}
      <section>
        <SectionHeader title="Shop by Category" />
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <CategoryGrid categories={homeData?.categories ?? []} />
        )}
      </section>
    </div>
  );
}
