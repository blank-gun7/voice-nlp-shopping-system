// Single source of truth for all backend communication.
// Components must never call fetch() directly.

import type {
  CategoryPageResponse,
  HomePageData,
  ListItem,
  RelatedResponse,
  SearchResponse,
  ShoppingList,
  VoiceCommandResponse,
} from "../types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Shared helper ─────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface TranscribeResponse {
  transcript: string;
  language: string;
  confidence: number;
}

export interface AddItemPayload {
  item_name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  added_via?: "voice" | "manual" | "suggestion";
}

export interface UpdateItemPayload {
  quantity?: number;
  unit?: string;
  is_checked?: boolean;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const api = {
  /** Check backend health. */
  async health(): Promise<boolean> {
    try {
      return (await fetch(`${BASE}/api/health`)).ok;
    } catch {
      return false;
    }
  },

  /**
   * POST /api/voice/transcribe
   * Send a raw audio Blob to the backend; receive the transcript.
   */
  async transcribe(audioBlob: Blob): Promise<TranscribeResponse> {
    const form = new FormData();
    form.append("file", audioBlob, "recording.webm");
    return request<TranscribeResponse>("/api/voice/transcribe", {
      method: "POST",
      body: form,
    });
  },

  /**
   * POST /api/voice/command
   * Full pipeline: audio → STT → NLP → list action → response.
   */
  async voiceCommand(audioBlob: Blob): Promise<VoiceCommandResponse> {
    const form = new FormData();
    form.append("file", audioBlob, "recording.webm");
    return request<VoiceCommandResponse>("/api/voice/command", {
      method: "POST",
      body: form,
    });
  },

  /**
   * POST /api/voice/process
   * NLP only — text in, ParsedCommand out.
   */
  async voiceProcess(text: string): Promise<VoiceCommandResponse> {
    return request<VoiceCommandResponse>("/api/voice/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  // ── Shopping Lists ──────────────────────────────────────────────────────────

  /**
   * POST /api/lists/
   * Create a new shopping list for the default user.
   */
  async createList(name = "My Shopping List"): Promise<ShoppingList> {
    return request<ShoppingList>("/api/lists/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  /**
   * GET /api/lists/{id}
   * Fetch the list with items grouped by category.
   */
  async getList(listId: number): Promise<ShoppingList> {
    return request<ShoppingList>(`/api/lists/${listId}`);
  },

  /**
   * POST /api/lists/{id}/items
   * Add an item to the list (increments quantity if duplicate).
   */
  async addItem(listId: number, item: AddItemPayload): Promise<ListItem> {
    return request<ListItem>(`/api/lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  },

  /**
   * PATCH /api/lists/{id}/items/{itemId}
   * Update quantity, unit, or checked state of an item.
   */
  async updateItem(
    listId: number,
    itemId: number,
    patch: UpdateItemPayload,
  ): Promise<ListItem> {
    return request<ListItem>(`/api/lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },

  /**
   * DELETE /api/lists/{id}/items/{itemId}
   * Remove a specific item from the list.
   */
  async removeItem(listId: number, itemId: number): Promise<void> {
    await request<unknown>(`/api/lists/${listId}/items/${itemId}`, {
      method: "DELETE",
    });
  },

  // ── Store / Marketplace ─────────────────────────────────────────────────────

  /**
   * GET /api/store/home
   * Homepage data: seasonal, popular, reorder, categories.
   */
  async getHome(): Promise<HomePageData> {
    return request<HomePageData>("/api/store/home");
  },

  /**
   * GET /api/store/category/{name}?page=1
   * Paginated products in a given category.
   */
  async getCategory(name: string, page = 1): Promise<CategoryPageResponse> {
    const encoded = encodeURIComponent(name);
    return request<CategoryPageResponse>(
      `/api/store/category/${encoded}?page=${page}`,
    );
  },

  /**
   * GET /api/store/product/{name}/related
   * Co-purchase and substitute suggestions for a product.
   */
  async getRelated(productName: string): Promise<RelatedResponse> {
    const encoded = encodeURIComponent(productName);
    return request<RelatedResponse>(`/api/store/product/${encoded}/related`);
  },

  /**
   * GET /api/store/search?q=apples
   * Search the item catalog by name.
   */
  async search(query: string): Promise<SearchResponse> {
    const encoded = encodeURIComponent(query);
    return request<SearchResponse>(`/api/store/search?q=${encoded}`);
  },
};
