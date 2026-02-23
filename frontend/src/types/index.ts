// ── Core domain types ────────────────────────────────────────────────────────

export interface Product {
  name: string;
  name_lower: string;
  category: string;
  common_units: string[];
  avg_price: number | null;
  is_seasonal: boolean;
  order_count: number;
}

export interface ListItem {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
  category: string;
  is_checked: boolean;
  added_via: "voice" | "manual" | "suggestion";
}

export interface CategoryGroup {
  category: string;
  items: ListItem[];
  count: number;
}

export interface ShoppingList {
  id: number;
  name: string;
  categories: CategoryGroup[];
  total_items: number;
  checked_items: number;
}

export interface HomePageData {
  seasonal: Product[];
  popular: Product[];
  reorder: ReorderItem[];
  categories: CategoryMeta[];
}

export interface ReorderItem {
  name: string;
  reason: string;
}

export interface CategoryMeta {
  name: string;
  count: number;
}

// ── NLP / Voice types ─────────────────────────────────────────────────────────

export interface ParsedCommand {
  intent: string;
  item: string | null;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  brand: string | null;
  price_max: number | null;
  confidence: number;
  method: "spacy" | "llm_fallback";
}

export interface ActionResult {
  status: "success" | "error" | "no_change";
  message?: string;
}

export interface Suggestions {
  co_purchase: SuggestionItem[];
  substitutes: SuggestionItem[];
  seasonal: SuggestionItem[];
  reorder: ReorderItem[];
}

export interface SuggestionItem {
  name: string;
  reason?: string;
}

export interface VoiceCommandResponse {
  transcript: string;
  parsed: ParsedCommand;
  action_result: ActionResult;
  updated_list: ShoppingList;
  suggestions: Suggestions | null;
  latency: Record<string, number>;
}

// ── App state ─────────────────────────────────────────────────────────────────

export type VoiceState = "idle" | "listening" | "processing" | "confirmed" | "error";

export interface AppState {
  voiceState: VoiceState;
  interimTranscript: string;
  voiceResult: VoiceCommandResponse | null;
  isVoiceOverlayOpen: boolean;

  currentList: ShoppingList | null;
  isListLoading: boolean;

  homeData: HomePageData | null;
  isHomeLoading: boolean;

  selectedProduct: Product | null;
  productSuggestions: { co_purchase: string[]; substitutes: string[] } | null;
  isProductSheetOpen: boolean;

  language: string;
  ttsEnabled: boolean;
  toast: Toast | null;
}

export type AppAction =
  | { type: "SET_VOICE_STATE"; payload: VoiceState }
  | { type: "SET_INTERIM_TRANSCRIPT"; payload: string }
  | { type: "SET_VOICE_RESULT"; payload: VoiceCommandResponse | null }
  | { type: "SET_VOICE_OVERLAY"; payload: boolean }
  | { type: "SET_LIST"; payload: ShoppingList | null }
  | { type: "SET_LIST_LOADING"; payload: boolean }
  | { type: "SET_HOME_DATA"; payload: HomePageData | null }
  | { type: "SET_HOME_LOADING"; payload: boolean }
  | { type: "SET_SELECTED_PRODUCT"; payload: Product | null }
  | { type: "SET_PRODUCT_SUGGESTIONS"; payload: { co_purchase: string[]; substitutes: string[] } | null }
  | { type: "SET_PRODUCT_SHEET"; payload: boolean }
  | { type: "SET_LANGUAGE"; payload: string }
  | { type: "SET_TTS_ENABLED"; payload: boolean }
  | { type: "SET_TOAST"; payload: Toast | null };

export interface Toast {
  message: string;
  type: "success" | "error" | "info";
}

// ── API types ─────────────────────────────────────────────────────────────────

export interface CategoryPageResponse {
  category: string;
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface SearchResponse {
  results: Product[];
  total: number;
  query: string;
}

export interface RelatedResponse {
  co_purchase: string[];
  substitutes: string[];
}
