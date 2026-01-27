'use client';

import OrderList from '@/components/orders/order-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';

export default function InitiatedOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const initiatedOrdersQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'groupBuyOrders'), where('initiatorId', '==', user.uid)) : null,
    [firestore, user]
  );
  
  const { data: initiatedOrders, isLoading: isLoadingInitiated } = useCollection<GroupBuyOrderDocument>(initiatedOrdersQuery);
  const isLoading = isUserLoading || isLoadingInitiated;

  return (
    <Card>
      <CardHeader>
        <CardTitle>我發起的訂單</CardTitle>
        <CardDescription>您發起的所有團購。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <OrderList orders={initiatedOrders || []} />
        )}
      </CardContent>
    </Card>
  );
}
