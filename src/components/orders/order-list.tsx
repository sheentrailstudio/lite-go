import type { GroupBuyOrderDocument } from '@/lib/definitions';
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import OrderCard from './order-card';

type OrderListProps = {
  orders: (GroupBuyOrderDocument & { id: string })[];
};

export default function OrderList({ orders }: OrderListProps) {
  if (!orders || orders.length === 0) {
    return <div className="text-center text-muted-foreground p-8">沒有找到任何訂單。</div>
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">狀態</TableHead>
          <TableHead className="min-w-[200px]">訂單名稱</TableHead>
          <TableHead className="hidden md:table-cell">發起人</TableHead>
          <TableHead className="hidden md:table-cell">建立日期</TableHead>
          <TableHead className="text-right">目標金額</TableHead>
          <TableHead className="w-[40px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </TableBody>
    </Table>
  );
}
