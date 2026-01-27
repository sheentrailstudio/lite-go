import Link from 'next/link';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type OrderCardProps = {
  order: GroupBuyOrderDocument & { id: string };
};

const StatusBadge = ({ status }: { status: GroupBuyOrderDocument['status'] }) => {
  switch (status) {
    case 'open':
      return <Badge variant="secondary">進行中</Badge>;
    case 'closed':
      return <Badge variant="outline">已結束</Badge>;
    case 'archived':
      return <Badge variant="destructive">已封存</Badge>;
    default:
      return null;
  }
};

export default function OrderCard({ order }: OrderCardProps) {
  // totalCost and participants are removed for performance in list view.
  // They will be available in the detail view.

  return (
    <TableRow className="bg-background">
      <TableCell>
        <StatusBadge status={order.status} />
      </TableCell>
      <TableCell>
        <Link href={`/dashboard/orders/${order.id}`} className="font-medium hover:underline">
          {order.name}
        </Link>
        <div className="block text-sm text-muted-foreground md:hidden">
          {order.createdAt ? format(parseISO(order.createdAt as string), 'MMM d, yyyy') : ''}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="text-sm text-muted-foreground">{order.initiatorName}</div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {order.createdAt ? format(parseISO(order.createdAt as string), 'MMM d, yyyy') : ''}
      </TableCell>
      <TableCell className="text-right font-medium">
        {order.targetAmount ? `$${order.targetAmount}` : '-'}
      </TableCell>
      <TableCell>
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/orders/${order.id}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
