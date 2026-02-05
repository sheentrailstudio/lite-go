import Link from 'next/link';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Clock, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type OrderCardProps = {
  order: GroupBuyOrderDocument & { id: string };
  basePath?: string;
};

export default function OrderCard({ order, basePath = '/dashboard/orders' }: OrderCardProps) {
  const imageUrl = order.image?.src || `https://picsum.photos/seed/${order.id}/800/800`;
  const isExpired = order.deadline ? new Date(order.deadline) < new Date() : false;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(112,197,181,0.2)] dark:bg-card border border-border/50">
        <Link href={`${basePath}/${order.id}`} className="flex flex-col h-full">
            {/* Visual Header */}
            <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image 
                    src={imageUrl} 
                    alt={order.name}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Floating Status */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border-none",
                        order.status === 'open' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/20 text-white backdrop-blur-md"
                    )}>
                        {order.status === 'open' ? 'Live' : 'Closed'}
                    </Badge>
                </div>

                {/* Bottom Content Overlay */}
                <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h3 className="text-2xl font-black leading-none tracking-tighter mb-2">
                        {order.name}
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-80">
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {order.participantIds?.length || 0} Joined
                        </span>
                        {order.deadline && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {format(parseISO(order.deadline), 'MM/dd')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black opacity-0 transition-all duration-500 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                    <ArrowUpRight className="h-5 w-5" />
                </div>
            </div>

            {/* Description & Footer */}
            <div className="flex flex-1 flex-col p-8 bg-card">
                <p className="text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed mb-8 italic">
                    「 {order.description || "團主很懶，什麼都沒寫..."} 」
                </p>
                
                <div className="mt-auto flex items-center justify-between border-t pt-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Initiator</span>
                        <span className="text-sm font-black">{order.initiatorName}</span>
                    </div>
                    {order.targetAmount && (
                        <div className="flex flex-col text-right">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Goal</span>
                             <span className="text-sm font-black text-primary">${order.targetAmount}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    </div>
  );
}
