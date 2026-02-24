import { createContext, useContext, useReducer } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { AppAction, AppState } from "./types";
import type { UseVoiceAssistantReturn } from "./hooks/useVoiceAssistant";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import MyListPage from "./pages/MyListPage";

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: AppState = {
  voiceState: "idle",
  interimTranscript: "",
  voiceResult: null,
  isVoiceOverlayOpen: false,

  currentList: null,
  isListLoading: false,

  homeData: null,
  isHomeLoading: false,

  selectedProduct: null,
  productSuggestions: null,
  isProductSheetOpen: false,

  language: "en-US",
  ttsEnabled: true,
  toast: null,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_VOICE_STATE":
      return { ...state, voiceState: action.payload };
    case "SET_INTERIM_TRANSCRIPT":
      return { ...state, interimTranscript: action.payload };
    case "SET_VOICE_RESULT":
      return { ...state, voiceResult: action.payload };
    case "SET_VOICE_OVERLAY":
      return { ...state, isVoiceOverlayOpen: action.payload };
    case "SET_LIST":
      return { ...state, currentList: action.payload };
    case "SET_LIST_LOADING":
      return { ...state, isListLoading: action.payload };
    case "SET_HOME_DATA":
      return { ...state, homeData: action.payload };
    case "SET_HOME_LOADING":
      return { ...state, isHomeLoading: action.payload };
    case "SET_SELECTED_PRODUCT":
      return { ...state, selectedProduct: action.payload };
    case "SET_PRODUCT_SUGGESTIONS":
      return { ...state, productSuggestions: action.payload };
    case "SET_PRODUCT_SHEET":
      return { ...state, isProductSheetOpen: action.payload };
    case "SET_LANGUAGE":
      return { ...state, language: action.payload };
    case "SET_TTS_ENABLED":
      return { ...state, ttsEnabled: action.payload };
    case "SET_TOAST":
      return { ...state, toast: action.payload };
    default:
      return state;
  }
}

// ── App context ───────────────────────────────────────────────────────────────

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContext.Provider");
  return ctx;
}

// ── Voice context (singleton — created once in Layout) ────────────────────────

export const VoiceContext = createContext<UseVoiceAssistantReturn | null>(null);

export function useVoiceContext(): UseVoiceAssistantReturn {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoiceContext must be used within VoiceContext.Provider");
  return ctx;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:name" element={<CategoryPage />} />
            <Route path="/list" element={<MyListPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
