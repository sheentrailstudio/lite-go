import Link from 'next/link';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { ChevronRight, Clock, Users, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';

type OrderCardProps = {
  order: GroupBuyOrderDocument & { id: string };
  basePath?: string;
};

const StatusBadge = ({ status }: { status: GroupBuyOrderDocument['status'] }) => {
  switch (status) {
    case 'open':
      return <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">進行中</Badge>;
    case 'closed':
      return <Badge variant="outline">已結束</Badge>;
    case 'archived':
      return <Badge variant="destructive">已封存</Badge>;
    default:
      return null;
  }
};

export default function OrderCard({ order, basePath = '/dashboard/orders' }: OrderCardProps) {
  const imageUrl = order.image?.src || `https://picsum.photos/seed/${order.id}/400/400`;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md">
        <Link href={`${basePath}/${order.id}`} className="flex flex-col sm:flex-row gap-4 p-4">
            {/* Image Container */}
            <div className="relative h-40 w-full sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-lg">
                <Image 
                    src={imageUrl} 
                    alt={order.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute top-2 left-2">
                    <StatusBadge status={order.status} />
                </div>
            </div>

            {/* Content Container */}
            <div className="flex flex-1 flex-col justify-between py-1">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {order.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {order.description}
                    </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{order.participantIds?.length || 0} 參與者</span>
                    </div>
                    {order.deadline && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{format(parseISO(order.deadline), 'MMM d')} 截止</span>
                        </div>
                    )}
                    {order.targetAmount && (
                         <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>目標 ${order.targetAmount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Action / Meta Container */}
            <div className="hidden sm:flex flex-col items-end justify-between py-1">
                <div className="text-xs text-muted-foreground">
                    由 {order.initiatorName} 發起
                </div>
                <div className="rounded-full bg-muted p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ChevronRight className="h-5 w-5" />
                </div>
            </div>
        </Link>
    </div>
  );
}
