'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import OrderList from '@/components/orders/order-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, or } from 'firebase/firestore';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import { useMemo } from 'react';

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const allOrdersQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'groupBuyOrders'), or(where('initiatorId', '==', user.uid), where('participantIds', 'array-contains', user.uid))) : null,
    [firestore, user]
  );
  
  const initiatedOrdersQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'groupBuyOrders'), where('initiatorId', '==', user.uid)) : null,
    [firestore, user]
  );
  
  const participatedOrdersQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'groupBuyOrders'), where('participantIds', 'array-contains', user.uid)) : null,
    [firestore, user]
  );

  const { data: allOrders, isLoading: isLoadingAll } = useCollection<GroupBuyOrderDocument>(allOrdersQuery);
  const { data: initiatedOrders, isLoading: isLoadingInitiated } = useCollection<GroupBuyOrderDocument>(initiatedOrdersQuery);
  const { data: participatedOrders, isLoading: isLoadingParticipated } = useCollection<GroupBuyOrderDocument>(participatedOrdersQuery);

  const isLoading = isUserLoading || isLoadingAll || isLoadingInitiated || isLoadingParticipated;

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle>我的訂單</CardTitle>
            <CardDescription>
              在這裡查看並管理您發起或參與的所有團購。
            </CardDescription>
          </div>
          <Button asChild size="sm" className="ml-4">
            <Link href="/dashboard/orders/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              建立新訂單
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">所有訂單</TabsTrigger>
                <TabsTrigger value="initiated">我發起的</TabsTrigger>
                <TabsTrigger value="participated">我參與的</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <OrderList orders={allOrders || []} />
              </TabsContent>
              <TabsContent value="initiated" className="mt-4">
                <OrderList orders={initiatedOrders || []} />
              </TabsContent>
              <TabsContent value="participated" className="mt-4">
                <OrderList orders={participatedOrders || []} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
