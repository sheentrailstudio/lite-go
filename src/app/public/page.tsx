'use client';

import OrderList from '@/components/orders/order-list';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { Loader2, Globe, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';

export default function PublicOrdersPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  const publicOrdersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'groupBuyOrders'), where('visibility', '==', 'public')) : null,
    [firestore]
  );
  
  const { data: publicOrders, isLoading } = useCollection<GroupBuyOrderDocument>(publicOrdersQuery);

  const filteredOrders = useMemo(() => {
      if (!publicOrders) return [];
      if (!searchQuery.trim()) return publicOrders;
      
      const q = searchQuery.toLowerCase();
      return publicOrders.filter(o => 
          o.name.toLowerCase().includes(q) || 
          o.description.toLowerCase().includes(q) ||
          o.initiatorName.toLowerCase().includes(q)
      );
  }, [publicOrders, searchQuery]);

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
        <div className="mb-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Globe className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">探索團購</h1>
            <p className="text-muted-foreground">加入其他人正在發起的有趣團購，大家一起買最划算。</p>
        </div>

        <div className="relative mb-8 max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="搜尋團購名稱、描述或發起人..." 
                className="pl-10 h-12 rounded-full border-muted bg-muted/20 focus:bg-background transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">正在搜尋公開團購...</p>
            </div>
        ) : (
            <>
                {filteredOrders.length === 0 && searchQuery ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/10">
                        <p className="text-muted-foreground italic">找不到符合 「{searchQuery}」 的團購。</p>
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-primary font-bold hover:underline"
                        >
                            清除搜尋條件
                        </button>
                    </div>
                ) : (
                    <OrderList orders={filteredOrders || []} basePath="/dashboard/orders" />
                )}
            </>
        )}
    </div>
  );
}
