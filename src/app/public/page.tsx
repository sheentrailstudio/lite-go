'use client';

import OrderList from '@/components/orders/order-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';

export default function PublicOrdersPage() {
  const firestore = useFirestore();

  const publicOrdersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'groupBuyOrders'), where('visibility', '==', 'public')) : null,
    [firestore]
  );
  
  const { data: publicOrders, isLoading } = useCollection<GroupBuyOrderDocument>(publicOrdersQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>公開訂單</CardTitle>
        <CardDescription>任何人都可以查看和加入的公開團購。</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <OrderList orders={publicOrders || []} />
        )}
      </CardContent>
    </Card>
  );
}
