import { useOrderHistory } from "../../hooks/useOrderHistory";
import OrderCard from "./OrderCard";
import SkeletonLoader from "../shared/SkeletonLoader";

export default function PastOrders() {
  const { orders, isLoading, error } = useOrderHistory();

  if (isLoading) {
    return (
      <div className="px-4">
        <SkeletonLoader variant="row" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <p className="text-stone-400 text-sm">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="text-6xl mb-5">📦</div>
        <h2 className="text-lg font-bold text-stone-700 mb-2 font-heading">
          No orders yet
        </h2>
        <p className="text-stone-400 text-sm">
          When you place an order, it will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {orders.map((order, i) => (
        <OrderCard key={order.order_id} order={order} index={orders.length - i} />
      ))}
    </div>
  );
}
