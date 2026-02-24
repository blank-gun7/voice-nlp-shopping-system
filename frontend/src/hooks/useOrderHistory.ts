import { useCallback, useEffect, useState } from "react";
import type { Order } from "../types";
import { api } from "../services/api";

export function useOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getOrderHistory();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orders, isLoading, error, refresh };
}
