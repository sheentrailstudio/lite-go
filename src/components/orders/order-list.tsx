import type { GroupBuyOrderDocument } from '@/lib/definitions';
import OrderCard from './order-card';

type OrderListProps = {
  orders: (GroupBuyOrderDocument & { id: string })[];
  basePath?: string;
};

export default function OrderList({ orders, basePath }: OrderListProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
        <p className="text-muted-foreground font-medium">沒有找到任何訂單。</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} basePath={basePath} />
      ))}
    </div>
  );
}
