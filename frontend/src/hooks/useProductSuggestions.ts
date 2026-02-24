/**
 * useProductSuggestions
 *
 * Fetches co-purchase and substitute suggestions for a given product.
 * Fires automatically when productName changes (ProductSheet open).
 */

import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { RelatedResponse } from "../types";

export interface UseProductSuggestionsReturn {
  suggestions: RelatedResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useProductSuggestions(
  productName: string | null,
): UseProductSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<RelatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productName) {
      setSuggestions(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getRelated(productName)
      .then((data) => {
        if (!cancelled) setSuggestions(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load suggestions");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productName]);

  return { suggestions, isLoading, error };
}
