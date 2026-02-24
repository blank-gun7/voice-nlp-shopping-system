/**
 * useHomeData
 *
 * Fetches homepage marketplace data (seasonal, popular, reorder, categories)
 * on mount and stores it in AppContext.
 */

import { useEffect } from "react";
import { useAppContext } from "../App";
import { api } from "../services/api";

export function useHomeData() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    if (state.homeData) return; // Already loaded — skip

    let cancelled = false;

    async function load() {
      dispatch({ type: "SET_HOME_LOADING", payload: true });
      try {
        const data = await api.getHome();
        if (!cancelled) dispatch({ type: "SET_HOME_DATA", payload: data });
      } catch {
        if (!cancelled) {
          dispatch({
            type: "SET_TOAST",
            payload: { message: "Could not load store data", type: "error" },
          });
        }
      } finally {
        if (!cancelled) dispatch({ type: "SET_HOME_LOADING", payload: false });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    homeData: state.homeData,
    isLoading: state.isHomeLoading,
  };
}
