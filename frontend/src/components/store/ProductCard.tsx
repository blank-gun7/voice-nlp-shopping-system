import { useAppContext } from "../../App";
import { useShoppingList } from "../../hooks/useShoppingList";
import type { Product } from "../../types";
import CategoryBadge from "../shared/CategoryBadge";

// Keyword → { emoji, bg } — checked against lower-cased product name
const PRODUCT_VISUALS: [string[], { emoji: string; bg: string }][] = [
  // Produce
  [["banana", "plantain"], { emoji: "🍌", bg: "bg-yellow-50" }],
  [["apple", "gala", "fuji", "granny smith"], { emoji: "🍎", bg: "bg-red-50" }],
  [["orange", "clementine", "mandarin", "tangerine"], { emoji: "🍊", bg: "bg-orange-50" }],
  [["strawberr"], { emoji: "🍓", bg: "bg-red-50" }],
  [["grape", "raisin"], { emoji: "🍇", bg: "bg-purple-50" }],
  [["watermelon"], { emoji: "🍉", bg: "bg-red-50" }],
  [["lemon", "lime"], { emoji: "🍋", bg: "bg-yellow-50" }],
  [["peach", "nectarine"], { emoji: "🍑", bg: "bg-orange-50" }],
  [["pear"], { emoji: "🍐", bg: "bg-green-50" }],
  [["mango"], { emoji: "🥭", bg: "bg-orange-50" }],
  [["pineapple"], { emoji: "🍍", bg: "bg-yellow-50" }],
  [["cherry", "cherries"], { emoji: "🍒", bg: "bg-red-50" }],
  [["blueberr", "cranberr", "raspberr", "blackberr"], { emoji: "🫐", bg: "bg-blue-50" }],
  [["avocado"], { emoji: "🥑", bg: "bg-green-50" }],
  [["tomato", "cherry tomato"], { emoji: "🍅", bg: "bg-red-50" }],
  [["broccoli"], { emoji: "🥦", bg: "bg-green-50" }],
  [["carrot"], { emoji: "🥕", bg: "bg-orange-50" }],
  [["corn"], { emoji: "🌽", bg: "bg-yellow-50" }],
  [["pepper", "capsicum", "jalapeño"], { emoji: "🫑", bg: "bg-green-50" }],
  [["lettuce", "spinach", "kale", "arugula", "salad"], { emoji: "🥬", bg: "bg-green-50" }],
  [["cucumber", "zucchini", "courgette"], { emoji: "🥒", bg: "bg-green-50" }],
  [["mushroom"], { emoji: "🍄", bg: "bg-stone-50" }],
  [["onion", "shallot", "leek"], { emoji: "🧅", bg: "bg-amber-50" }],
  [["garlic"], { emoji: "🧄", bg: "bg-stone-50" }],
  [["potato", "yam", "sweet potato"], { emoji: "🥔", bg: "bg-amber-50" }],
  [["eggplant", "aubergine"], { emoji: "🍆", bg: "bg-purple-50" }],
  // Dairy
  [["milk", "oat milk", "almond milk", "soy milk"], { emoji: "🥛", bg: "bg-blue-50" }],
  [["cheese", "cheddar", "mozzarella", "parmesan", "brie", "gouda"], { emoji: "🧀", bg: "bg-yellow-50" }],
  [["egg", "eggs"], { emoji: "🥚", bg: "bg-yellow-50" }],
  [["butter", "ghee", "margarine"], { emoji: "🧈", bg: "bg-yellow-50" }],
  [["yogurt", "yoghurt"], { emoji: "🍦", bg: "bg-blue-50" }],
  [["cream", "whipped cream"], { emoji: "🍶", bg: "bg-stone-50" }],
  // Meat & Seafood
  [["chicken", "poultry", "hen", "turkey"], { emoji: "🍗", bg: "bg-amber-50" }],
  [["beef", "steak", "ground beef", "brisket", "sirloin"], { emoji: "🥩", bg: "bg-red-50" }],
  [["pork", "bacon", "ham", "sausage", "salami", "pepperoni"], { emoji: "🥓", bg: "bg-red-50" }],
  [["fish", "salmon", "tuna", "tilapia", "cod", "halibut", "trout"], { emoji: "🐟", bg: "bg-blue-50" }],
  [["shrimp", "prawn", "lobster", "crab", "scallop", "clam", "oyster"], { emoji: "🦐", bg: "bg-orange-50" }],
  // Bakery
  [["bread", "loaf", "baguette", "sourdough", "pita", "naan", "roll", "bun"], { emoji: "🍞", bg: "bg-amber-50" }],
  [["croissant", "pastry"], { emoji: "🥐", bg: "bg-amber-50" }],
  [["cake", "cupcake", "muffin", "donut", "doughnut"], { emoji: "🍰", bg: "bg-pink-50" }],
  [["cookie", "biscuit"], { emoji: "🍪", bg: "bg-amber-50" }],
  [["tortilla", "wrap"], { emoji: "🫓", bg: "bg-amber-50" }],
  // Beverages
  [["water", "sparkling water", "mineral water"], { emoji: "💧", bg: "bg-blue-50" }],
  [["juice", "lemonade"], { emoji: "🧃", bg: "bg-orange-50" }],
  [["soda", "cola", "pepsi", "sprite", "fanta", "energy drink", "soft drink"], { emoji: "🥤", bg: "bg-red-50" }],
  [["coffee", "espresso", "latte"], { emoji: "☕", bg: "bg-amber-50" }],
  [["tea", "herbal tea", "green tea"], { emoji: "🍵", bg: "bg-green-50" }],
  [["beer", "ale", "lager"], { emoji: "🍺", bg: "bg-amber-50" }],
  [["wine"], { emoji: "🍷", bg: "bg-red-50" }],
  // Snacks & Pantry
  [["chip", "crisp", "popcorn", "pretzel", "cracker"], { emoji: "🍿", bg: "bg-yellow-50" }],
  [["chocolate", "cocoa"], { emoji: "🍫", bg: "bg-amber-50" }],
  [["candy", "sweet", "gummy", "lollipop"], { emoji: "🍬", bg: "bg-pink-50" }],
  [["ice cream", "gelato", "sorbet"], { emoji: "🍨", bg: "bg-blue-50" }],
  [["honey"], { emoji: "🍯", bg: "bg-amber-50" }],
  [["jam", "jelly", "marmalade", "preserve"], { emoji: "🫙", bg: "bg-red-50" }],
  [["peanut butter", "almond butter", "nut butter"], { emoji: "🥜", bg: "bg-amber-50" }],
  [["rice", "basmati", "jasmine"], { emoji: "🍚", bg: "bg-stone-50" }],
  [["pasta", "noodle", "spaghetti", "fettuccine", "penne", "macaroni"], { emoji: "🍝", bg: "bg-amber-50" }],
  [["soup", "broth", "stock"], { emoji: "🍲", bg: "bg-orange-50" }],
  [["oil", "olive oil", "vegetable oil", "coconut oil"], { emoji: "🫒", bg: "bg-green-50" }],
  [["salt", "pepper", "spice", "herb", "seasoning", "sauce", "vinegar", "mustard", "ketchup", "mayo"], { emoji: "🧂", bg: "bg-stone-50" }],
  [["flour", "sugar", "baking", "yeast"], { emoji: "🧁", bg: "bg-stone-50" }],
  [["bean", "lentil", "chickpea", "hummus"], { emoji: "🫘", bg: "bg-amber-50" }],
  [["nut", "almond", "cashew", "walnut", "pecan", "pistachio"], { emoji: "🥜", bg: "bg-amber-50" }],
  [["tofu", "tempeh"], { emoji: "🫕", bg: "bg-stone-50" }],
  // Frozen
  [["frozen", "ice"], { emoji: "🧊", bg: "bg-blue-50" }],
];

// Category-level fallback
const CATEGORY_VISUALS: Record<string, { emoji: string; bg: string }> = {
  produce: { emoji: "🥦", bg: "bg-green-50" },
  dairy: { emoji: "🥛", bg: "bg-blue-50" },
  meat: { emoji: "🥩", bg: "bg-red-50" },
  seafood: { emoji: "🐟", bg: "bg-blue-50" },
  bakery: { emoji: "🍞", bg: "bg-amber-50" },
  beverages: { emoji: "🧃", bg: "bg-orange-50" },
  snacks: { emoji: "🍿", bg: "bg-yellow-50" },
  frozen: { emoji: "🧊", bg: "bg-blue-50" },
  pantry: { emoji: "🫙", bg: "bg-stone-50" },
  deli: { emoji: "🧀", bg: "bg-yellow-50" },
  household: { emoji: "🧹", bg: "bg-stone-50" },
  "personal care": { emoji: "🪥", bg: "bg-purple-50" },
  "baby care": { emoji: "🍼", bg: "bg-pink-50" },
  "pet care": { emoji: "🐾", bg: "bg-amber-50" },
};

export function getProductVisual(name: string, category: string): { emoji: string; bg: string } {
  const lower = name.toLowerCase();
  for (const [keywords, visual] of PRODUCT_VISUALS) {
    if (keywords.some((kw) => lower.includes(kw))) return visual;
  }
  return CATEGORY_VISUALS[category.toLowerCase()] ?? { emoji: "🛒", bg: "bg-stone-100" };
}

interface ProductCardProps {
  product: Product;
  /** "compact" for horizontal scroll rows; "grid" for category page */
  variant?: "compact" | "grid";
}

export default function ProductCard({ product, variant = "compact" }: ProductCardProps) {
  const { dispatch } = useAppContext();
  const { addItem } = useShoppingList();
  const visual = getProductVisual(product.name, product.category);

  const handleTap = () => {
    dispatch({ type: "SET_SELECTED_PRODUCT", payload: product });
    dispatch({ type: "SET_PRODUCT_SHEET", payload: true });
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addItem({ item_name: product.name, quantity: 1, category: product.category });
  };

  if (variant === "grid") {
    return (
      <div
        onClick={handleTap}
        className="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
      >
        <div className={`w-full aspect-square ${visual.bg} rounded-xl flex items-center justify-center mb-2 text-3xl`}>
          {visual.emoji}
        </div>
        <p className="text-sm font-semibold text-stone-800 line-clamp-2 mb-1 capitalize">
          {product.name}
        </p>
        <CategoryBadge category={product.category} className="mb-2" />
        {product.avg_price && (
          <p className="text-xs text-stone-500">${product.avg_price.toFixed(2)}</p>
        )}
        <button
          onClick={handleAdd}
          className="mt-2 w-full py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
        >
          + Add
        </button>
      </div>
    );
  }

  // Compact variant for horizontal scroll
  return (
    <div
      onClick={handleTap}
      className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-95"
    >
      <div className={`w-full aspect-square ${visual.bg} rounded-xl flex items-center justify-center mb-2 text-3xl`}>
        {visual.emoji}
      </div>
      <p className="text-xs font-semibold text-stone-800 line-clamp-2 capitalize mb-1">
        {product.name}
      </p>
      {product.avg_price && (
        <p className="text-xs text-stone-400">${product.avg_price.toFixed(2)}</p>
      )}
      <button
        onClick={handleAdd}
        className="mt-2 w-full py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
      >
        + Add
      </button>
    </div>
  );
}
