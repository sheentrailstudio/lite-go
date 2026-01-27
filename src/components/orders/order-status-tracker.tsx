'use client';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineTitle,
  TimelineBody,
} from '@/components/ui/timeline';
import type { Order, StatusUpdate } from '@/lib/definitions';
import { Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export default function OrderStatusTracker({
  order,
}: {
  order: Order;
}) {
  const [newStatus, setNewStatus] = useState('');
  const { user } = useUser();
  const firestore = useFirestore();

  const isInitiator = user?.uid === order.initiatorId;

  const handleAddStatus = () => {
    if (newStatus.trim() === '' || !firestore) return;

    const newUpdate: Omit<StatusUpdate, 'id'> = {
      message: newStatus,
      createdAt: new Date().toISOString(),
    };
    
    addDocumentNonBlocking(collection(firestore, 'groupBuyOrders', order.id, 'statusUpdates'), newUpdate);
    
    setNewStatus('');
    toast({ title: '狀態已更新！' });
  };

  const hasStatusTracking = order.enableStatusTracking;

  if (!hasStatusTracking) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>訂單狀態追蹤</CardTitle>
        <CardDescription>查看團購的最新進度。</CardDescription>
      </CardHeader>
      <CardContent>
        {isInitiator && (
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="新增狀態更新，例如：已到貨"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
               onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStatus();
                }
            }}
            />
            <Button onClick={handleAddStatus}>
              <Plus className="mr-2 h-4 w-4" />
              新增
            </Button>
          </div>
        )}
        {(order.statusUpdates && order.statusUpdates.length > 0) ? (
          <Timeline>
            {order.statusUpdates?.slice().reverse().map((update, index) => (
              <TimelineItem key={update.id}>
                 {index < order.statusUpdates!.length - 1 && <TimelineConnector />}
                <TimelineHeader>
                  <TimelineIcon />
                  <TimelineTitle>{update.message}</TimelineTitle>
                </TimelineHeader>
                <TimelineBody>
                  {format(parseISO(update.createdAt), 'PPP p', { locale: zhTW })}
                </TimelineBody>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-4">
            {isInitiator ? '新增第一筆狀態來通知參與者吧！' : '主揪尚未更新任何狀態。'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
