import type { GroupBuyOrderDocument } from '@/lib/definitions';
import OrderCard from './order-card';

type OrderListProps = {
  orders: (GroupBuyOrderDocument & { id: string })[];
  basePath?: string;
};

export default function OrderList({ orders, basePath }: OrderListProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center border-2 border-dashed rounded-[3rem] bg-muted/10">
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-sm">No Active Orders</p>
        <p className="text-xs text-muted-foreground mt-2 opacity-50 font-medium italic">目前沒有任何進行中的團購</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} basePath={basePath} />
      ))}
    </div>
  );
}
