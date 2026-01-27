'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Users, Package, Share2, Globe, Lock, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Item, User, CartItem, Order, GroupBuyOrderDocument, Participant, StatusUpdate } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import OrderStatusTracker from '@/components/orders/order-status-tracker';
import { useDoc, useCollection, useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';


const renderSelectedAttributes = (cartItem: CartItem) => {
  if (!cartItem.selectedAttributes) return null;

  const attributeEntries = Object.entries(cartItem.selectedAttributes);
  if (attributeEntries.length === 0) return null;

  const attributeText = attributeEntries
    .map(([attrId, optionValue]) => {
        const attribute = cartItem.item.attributes?.find(a => a.id === attrId);
        const option = attribute?.options.find(o => o.value === optionValue);
        const priceText = option && option.price > 0 ? ` (+$${option.price})` : '';
        return `${attribute?.name || '屬性'}: ${optionValue}${priceText}`;
    })
    .join(', ');

  return <span className="text-xs">({attributeText})</span>;
};


function OrderDetailsDisplay({ order, onJoinOrder }: { order: Order, onJoinOrder: () => void }) {
  const { toast } = useToast();
  const { user } = useUser();

  const orderUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = () => {
    navigator.clipboard.writeText(orderUrl).then(() => {
        toast({
            title: '已複製短網址！',
            description: '訂單的分享連結已複製到您的剪貼簿。',
        });
    });
  };
  
  const isParticipant = order.participants.some(p => p.id === user?.uid);

  const totalCost = order.participants.reduce((sum, p) => sum + p.totalCost, 0);

  const itemsSummary = new Map<string, { item: Item, totalQuantity: number, participants: { user: User, quantity: number }[] }>();

  order.participants.forEach(p => {
    p.items.forEach(cartItem => {
      if (!itemsSummary.has(cartItem.item.id)) {
        itemsSummary.set(cartItem.item.id, {
          item: cartItem.item,
          totalQuantity: 0,
          participants: []
        });
      }
      const summary = itemsSummary.get(cartItem.item.id)!;
      summary.totalQuantity += cartItem.quantity;
      summary.participants.push({ user: p.user, quantity: cartItem.quantity });
    });
  });

  const sortedItemsSummary = Array.from(itemsSummary.values()).sort((a,b) => b.totalQuantity - a.totalQuantity);

  // In a real app, this would be a real "add to cart" flow.
  // For now, clicking "Join" will just add the user as a participant with a placeholder item.
  const handleJoin = () => {
    onJoinOrder();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            {order.image && (
              <Image
                src={order.image.src}
                alt={order.image.alt}
                width={84}
                height={84}
                className="rounded-lg object-cover"
                data-ai-hint={order.image.hint}
              />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-headline">{order.name}</CardTitle>
                <div className="flex items-center gap-2">
                    <Badge variant={order.status === 'open' ? 'secondary' : 'outline'} className="capitalize">{order.status === 'open' ? '進行中' : '已結束'}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1 capitalize">
                        {order.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {order.visibility === 'public' ? '公開' : '私人'}
                    </Badge>
                </div>
              </div>
              <CardDescription>{order.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              {order.deadline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>截止日期: {format(parseISO(order.deadline), 'PPpp')}</span>
                </div>
              )}
              {order.targetAmount && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>目標: ${order.targetAmount}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{order.participants.length} 參與者</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{order.availableItems.length} 可用項目</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <OrderStatusTracker order={order} />
        
        <Card>
          <CardHeader>
            <CardTitle>可用項目</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.availableItems.map(item => (
                <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                         <div>
                            {item.images && item.images.length > 0 && (
                                <Carousel className="w-full max-w-xs mx-auto mb-4">
                                <CarouselContent>
                                    {item.images.map((image, index) => (
                                    <CarouselItem key={index}>
                                        <div className="p-1">
                                        <Card>
                                            <CardContent className="flex aspect-square items-center justify-center p-0">
                                                 <Image src={image.src as string} alt={image.alt} width={200} height={200} className="rounded-md object-cover" />
                                            </CardContent>
                                        </Card>
                                        </div>
                                    </CarouselItem>
                                    ))}
                                </CarouselContent>
                                {item.images.length > 1 && <>
                                    <CarouselPrevious />
                                    <CarouselNext />
                                </>}
                                </Carousel>
                            )}
                         </div>

                         <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-lg font-bold text-primary">${item.price}</p>
                            {item.maxQuantity && <p className="text-sm text-muted-foreground">庫存: {item.maxQuantity}</p>}

                            {item.attributes && item.attributes.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {item.attributes.map(attr => (
                                        <div key={attr.id}>
                                            <p className="text-sm font-medium">{attr.name}</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {attr.options.map(opt => (
                                                    <Badge key={opt.id} variant="outline">{opt.value}{opt.price > 0 ? ` (+$${opt.price})` : ''}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                         </div>
                    </CardContent>
                </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>參與者</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {order.participants.map(p => (
              <div key={p.user.id} className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={p.user.avatarUrl} />
                    <AvatarFallback>{p.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{p.user.name}</p>
                     <ul className="text-sm text-muted-foreground list-disc pl-5 mt-1 space-y-1">
                      {p.items.map((cartItem, idx) => (
                        <li key={`${cartItem.item.id}-${idx}`}>
                          {cartItem.item.name} x {cartItem.quantity} {renderSelectedAttributes(cartItem)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${p.totalCost}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>項目訂購詳情</CardTitle>
            <CardDescription>查看每個項目有哪些人訂購。</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {sortedItemsSummary.map(({ item, totalQuantity, participants }) => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">總計: {totalQuantity}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pt-2">
                      {participants.map(p => (
                        <li key={p.user.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={p.user.avatarUrl} />
                              <AvatarFallback>{p.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{p.user.name}</span>
                          </div>
                          <span>訂購 {p.quantity} 個</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>訂單摘要</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">小計</span>
              <span>${totalCost}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">服務費</span>
              <span>$0</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span className="text-foreground">總計</span>
              <span>${totalCost}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={order.status !== 'open' || isParticipant} onClick={handleJoin}>
              {isParticipant ? "您已加入" : "加入訂單"}
            </Button>
          </CardFooter>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>分享訂單</CardTitle>
            </CardHeader>
            <CardContent>
                {order.visibility === 'private' ? (
                    <p className="text-sm text-muted-foreground">
                        此為私人訂單。分享以下連結以邀請他人加入。
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        此為公開訂單，任何人都可以搜尋並加入。
                    </p>
                )}
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    分享連結
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}


export default function OrderDetailsPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const orderRef = useMemoFirebase(() => firestore ? doc(firestore, 'groupBuyOrders', id) : null, [firestore, id]);
  const itemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'groupBuyOrders', id, 'items') : null, [firestore, id]);
  const participantsRef = useMemoFirebase(() => firestore ? collection(firestore, 'groupBuyOrders', id, 'participants') : null, [firestore, id]);
  const statusUpdatesRef = useMemoFirebase(() => firestore ? collection(firestore, 'groupBuyOrders', id, 'statusUpdates') : null, [firestore, id]);
  
  const { data: orderDoc, isLoading: isLoadingOrder } = useDoc<GroupBuyOrderDocument>(orderRef);
  const { data: availableItems, isLoading: isLoadingItems } = useCollection<Item>(itemsRef);
  const { data: participantsData, isLoading: isLoadingParticipants } = useCollection<Omit<Participant, 'user'>>(participantsRef);
  const { data: statusUpdates, isLoading: isLoadingStatus } = useCollection<StatusUpdate>(statusUpdatesRef);

  const [composedOrder, setComposedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const composeOrder = async () => {
        if (!orderDoc || !availableItems || !participantsData || !statusUpdates || !firestore) return;

        setIsLoading(true);

        const initiatorSnap = await getDoc(doc(firestore, 'users', orderDoc.initiatorId));
        if (!initiatorSnap.exists()) {
             console.error("Initiator not found!");
             setIsLoading(false);
             return;
        };
        const initiator = { ...initiatorSnap.data(), id: initiatorSnap.id } as User;

        const participantsWithUsers = await Promise.all(
            participantsData.map(async (p) => {
                const userSnap = await getDoc(doc(firestore, 'users', p.id));
                const userData = { ...userSnap.data(), id: userSnap.id } as User;
                
                // This is a simplified version of item hydration.
                // A real app would need to handle selected attributes and calculate costs correctly.
                const hydratedItems = (p.items || []).map(cartItem => {
                   const item = availableItems.find(i => i.id === (cartItem as any).itemId);
                   return {
                       ...cartItem,
                       item: item || {} as Item,
                   };
                });

                return {
                    ...p,
                    user: userData,
                    items: hydratedItems,
                } as Participant;
            })
        );
        
        setComposedOrder({
            ...(orderDoc as GroupBuyOrderDocument & {id: string}),
            initiator,
            availableItems,
            participants: participantsWithUsers,
            statusUpdates,
        });

        setIsLoading(false);
    };

    if (!isLoadingOrder && !isLoadingItems && !isLoadingParticipants && !isLoadingStatus) {
        composeOrder();
    }
  }, [orderDoc, availableItems, participantsData, statusUpdates, firestore, isLoadingOrder, isLoadingItems, isLoadingParticipants, isLoadingStatus]);

  const handleJoinOrder = () => {
    if (!firestore || !user || !composedOrder || !availableItems?.length) {
      toast({ title: "無法加入訂單", variant: "destructive" });
      return;
    }
    
    const isAlreadyParticipant = composedOrder.participantIds?.includes(user.uid);
    if(isAlreadyParticipant) {
        toast({ title: "您已經是參與者", variant: "destructive" });
        return;
    }

    // For simplicity, add user with the first available item.
    // A real implementation would have a UI to select items.
    const firstItem = availableItems[0];
    const participantData: Omit<Participant, 'id' | 'user'> = {
      totalCost: firstItem.price,
      items: [{
        itemId: firstItem.id,
        quantity: 1,
        itemPrice: firstItem.price,
        itemName: firstItem.name,
      } as any]
    };
    
    // 1. Add participant to subcollection
    setDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id, 'participants', user.uid), participantData, {});

    // 2. Update participantIds array on the main order doc
    const newParticipantIds = [...(composedOrder.participantIds || []), user.uid];
    updateDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id), { participantIds: newParticipantIds });
    
    toast({ title: "成功加入訂單！" });
  };


  if (isLoading || !composedOrder) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!isLoading && !composedOrder) {
    notFound();
  }

  return <OrderDetailsDisplay order={composedOrder} onJoinOrder={handleJoinOrder} />;
}
