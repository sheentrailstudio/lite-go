'use client';

import OrderList from '@/components/orders/order-list';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Loader2, Globe } from 'lucide-react';

export default function PublicOrdersPage() {
  const firestore = useFirestore();

  const publicOrdersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'groupBuyOrders'), where('visibility', '==', 'public')) : null,
    [firestore]
  );
  
  const { data: publicOrders, isLoading } = useCollection<GroupBuyOrderDocument>(publicOrdersQuery);

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
        <div className="mb-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Globe className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">探索團購</h1>
            <p className="text-muted-foreground">加入其他人正在發起的有趣團購，大家一起買最划算。</p>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">正在搜尋公開團購...</p>
            </div>
        ) : (
            <OrderList orders={publicOrders || []} basePath="/dashboard/orders" />
        )}
    </div>
  );
}
