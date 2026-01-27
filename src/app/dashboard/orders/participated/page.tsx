'use client';

import OrderList from '@/components/orders/order-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';

export default function ParticipatedOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const participatedOrdersQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'groupBuyOrders'), where('participantIds', 'array-contains', user.uid)) : null,
    [firestore, user]
  );

  const { data: participatedOrders, isLoading: isLoadingParticipated } = useCollection<GroupBuyOrderDocument>(participatedOrdersQuery);
  const isLoading = isUserLoading || isLoadingParticipated;

  return (
    <Card>
      <CardHeader>
        <CardTitle>我參與的訂單</CardTitle>
        <CardDescription>您加入的所有團購。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <OrderList orders={participatedOrders || []} />
        )}
      </CardContent>
    </Card>
  );
}
