/**
 * useShoppingList
 *
 * Manages the current shopping list:
 * - Initialises by fetching/creating the default list (ID stored in localStorage)
 * - Wraps add / update / remove with optimistic updates + server sync
 * - Dispatches to AppContext so all components see the latest list
 */

import { useCallback, useEffect } from "react";
import { useAppContext } from "../App";
import { api, type AddItemPayload, type UpdateItemPayload } from "../services/api";
import { getStoredListId, setStoredListId } from "./useVoiceAssistant";

export interface UseShoppingListReturn {
  listId: number | null;
  refreshList: () => Promise<void>;
  addItem: (item: AddItemPayload) => Promise<void>;
  updateItem: (itemId: number, patch: UpdateItemPayload) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}

export function useShoppingList(): UseShoppingListReturn {
  const { state, dispatch } = useAppContext();

  // ── Bootstrap: create or fetch the list on first mount ──────────────────────

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      dispatch({ type: "SET_LIST_LOADING", payload: true });
      try {
        let listId = getStoredListId();

        if (listId !== null) {
          // Try fetching the stored list
          try {
            const list = await api.getList(listId);
            if (!cancelled) dispatch({ type: "SET_LIST", payload: list });
            return;
          } catch {
            // Stored ID is stale — fall through to recovery
            listId = null;
          }
        }

        // No stored ID or stored ID was stale — try the seeded default list (ID 1)
        try {
          const list = await api.getList(1);
          if (!cancelled) {
            setStoredListId(1);
            dispatch({ type: "SET_LIST", payload: list });
          }
          return;
        } catch {
          // Seeded list doesn't exist — create a new one
        }

        const created = await api.createList("My Shopping List");
        if (!cancelled) {
          setStoredListId(created.id);
          dispatch({ type: "SET_LIST", payload: created });
        }
      } catch {
        if (!cancelled) {
          dispatch({
            type: "SET_TOAST",
            payload: { message: "Could not load your list", type: "error" },
          });
        }
      } finally {
        if (!cancelled) dispatch({ type: "SET_LIST_LOADING", payload: false });
      }
    }

    // Only bootstrap once — when there is no list loaded yet
    if (!state.currentList) {
      bootstrap();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh ──────────────────────────────────────────────────────────────────

  const refreshList = useCallback(async (): Promise<void> => {
    const listId = getStoredListId();
    if (listId === null) return;
    try {
      const list = await api.getList(listId);
      dispatch({ type: "SET_LIST", payload: list });
    } catch {
      dispatch({
        type: "SET_TOAST",
        payload: { message: "Could not refresh list", type: "error" },
      });
    }
  }, [dispatch]);

  // ── Add item ─────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    async (item: AddItemPayload): Promise<void> => {
      const listId = getStoredListId();
      if (listId === null) return;
      try {
        await api.addItem(listId, { ...item, added_via: "manual" });
        await refreshList();
        dispatch({
          type: "SET_TOAST",
          payload: { message: `Added ${item.item_name}`, type: "success" },
        });
      } catch {
        dispatch({
          type: "SET_TOAST",
          payload: { message: "Could not add item", type: "error" },
        });
      }
    },
    [dispatch, refreshList],
  );

  // ── Update item ──────────────────────────────────────────────────────────────

  const updateItem = useCallback(
    async (itemId: number, patch: UpdateItemPayload): Promise<void> => {
      const listId = getStoredListId();
      if (listId === null) return;

      // Optimistic update
      if (state.currentList) {
        const optimistic = {
          ...state.currentList,
          categories: state.currentList.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((it) =>
              it.id === itemId ? { ...it, ...patch } : it,
            ),
          })),
        };
        dispatch({ type: "SET_LIST", payload: optimistic });
      }

      try {
        await api.updateItem(listId, itemId, patch);
      } catch {
        // Roll back optimistic update on failure
        await refreshList();
        dispatch({
          type: "SET_TOAST",
          payload: { message: "Could not update item", type: "error" },
        });
      }
    },
    [dispatch, refreshList, state.currentList],
  );

  // ── Remove item ──────────────────────────────────────────────────────────────

  const removeItem = useCallback(
    async (itemId: number): Promise<void> => {
      const listId = getStoredListId();
      if (listId === null) return;

      // Optimistic removal
      if (state.currentList) {
        const optimistic = {
          ...state.currentList,
          categories: state.currentList.categories
            .map((cat) => ({
              ...cat,
              items: cat.items.filter((it) => it.id !== itemId),
            }))
            .filter((cat) => cat.items.length > 0),
          total_items: state.currentList.total_items - 1,
        };
        dispatch({ type: "SET_LIST", payload: optimistic });
      }

      try {
        await api.removeItem(listId, itemId);
      } catch {
        // Roll back on failure
        await refreshList();
        dispatch({
          type: "SET_TOAST",
          payload: { message: "Could not remove item", type: "error" },
        });
      }
    },
    [dispatch, refreshList, state.currentList],
  );

  return {
    listId: getStoredListId(),
    refreshList,
    addItem,
    updateItem,
    removeItem,
  };
}
