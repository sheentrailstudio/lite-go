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
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Clock, 
    DollarSign, 
    Users, 
    Package, 
    Share2, 
    Globe, 
    Lock, 
    Loader2, 
    CheckCircle2, 
    XCircle,
    Archive,
    Ban
} from 'lucide-react';
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
import SummaryView from '@/components/orders/summary-view';
import JoinOrderDialog from '@/components/orders/join-order-dialog';
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


function OrderDetailsDisplay({ 
  order, 
  onJoinOrder, 
  onUpdatePayment, 
  onUpdateStatus,
  isJoining 
}: { 
  order: Order, 
  onJoinOrder: (items: CartItem[]) => void, 
  onUpdatePayment: (userId: string, paid: boolean) => void,
  onUpdateStatus: (status: 'open' | 'closed' | 'archived') => void,
  isJoining: boolean 
}) {
  const { toast } = useToast();
  const { user } = useUser();

  const isInitiator = user?.uid === order.initiatorId;
  const isParticipant = order.participants.some(p => p.id === user?.uid);
  const isPublic = order.visibility === 'public';
  
  // Visibility Logic: If private, only initiator, participants, or people with link can see.
  // Jill's specific request: "If public, everyone can see details."
  
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

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px] lg:gap-10">
      <div className="space-y-6">
        {/* Hero Card */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative h-48 w-full">
                <Image
                    src={order.image?.src || `https://picsum.photos/seed/${order.id}/800/400`}
                    alt={order.name}
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">{order.name}</h1>
                        <p className="mt-1 text-sm opacity-90">{order.description}</p>
                    </div>
                     <div className="flex gap-2">
                        <Badge className={cn(
                            "border-none px-3 py-1",
                            order.status === 'open' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            {order.status === 'open' ? '進行中' : order.status === 'closed' ? '已截單' : '已封存'}
                        </Badge>
                    </div>
                </div>
            </div>
            {isInitiator && (
                <div className="flex items-center gap-2 p-4 bg-muted/10 border-t">
                    <span className="text-xs font-bold text-muted-foreground uppercase ml-2 mr-auto">管理員工具</span>
                    {order.status === 'open' ? (
                        <Button size="sm" variant="outline" className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => onUpdateStatus('closed')}>
                            <Ban className="h-3.5 w-3.5 mr-1.5" /> 停止收單
                        </Button>
                    ) : order.status === 'closed' ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => onUpdateStatus('open')}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> 重新開啟
                        </Button>
                    ) : null}
                    <Button size="sm" variant="outline" className="h-8" onClick={() => onUpdateStatus('archived')}>
                        <Archive className="h-3.5 w-3.5 mr-1.5" /> 封存訂單
                    </Button>
                </div>
            )}
            <div className="grid grid-cols-4 divide-x border-t bg-muted/20">
                {[
                    { label: '參與者', value: order.participants.length, icon: Users },
                    { label: '目標金額', value: order.targetAmount ? `$${order.targetAmount}` : '無限制', icon: DollarSign },
                    { label: '截止時間', value: order.deadline ? format(parseISO(order.deadline), 'MM/dd HH:mm') : '未設定', icon: Clock },
                    { label: '可選項目', value: order.availableItems.length, icon: Package },
                ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-4 px-2 text-center">
                        <stat.icon className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-sm font-bold">{stat.value}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{stat.label}</span>
                    </div>
                ))}
            </div>
        </div>
        
        <OrderStatusTracker order={order} />
        
        {/* Menu Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 px-1">
             <Package className="h-5 w-5 text-primary" /> 團購菜單
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {order.availableItems.map(item => (
                <Card key={item.id} className="overflow-hidden border-none bg-card shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0 flex flex-col">
                        <div className="relative h-40 w-full bg-muted">
                            {item.images && item.images.length > 0 ? (
                                <Image src={item.images[0].src as string} alt={item.name} fill className="object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <Package className="h-10 w-10 opacity-20" />
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-lg">{item.name}</h3>
                            <p className="text-primary font-black text-xl mt-1">${item.price}</p>
                            
                            {item.attributes && item.attributes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {item.attributes.map(attr => (
                                        <Badge key={attr.id} variant="secondary" className="text-[10px] bg-muted py-0 px-2 font-normal">
                                            {attr.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>
        </div>

        {/* Participant Activity */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">參與者動態</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {order.participants.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground italic">目前還沒有人加入，快來成為第一個吧！</p>
            ) : (
                order.participants.map(p => (
                <div key={p.user.id} className="flex items-start justify-between border-b pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                    {isInitiator && (
                        <div className="flex flex-col items-center gap-1 mr-1">
                            <Checkbox 
                                id={`paid-${p.id}`} 
                                checked={p.paid} 
                                onCheckedChange={(checked) => onUpdatePayment(p.id, checked as boolean)}
                            />
                            <Label htmlFor={`paid-${p.id}`} className="text-[10px] text-muted-foreground uppercase font-bold">已付</Label>
                        </div>
                    )}
                    <Avatar className="h-12 w-12 border-2 border-background ring-2 ring-muted">
                        <AvatarImage src={p.user.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary">{p.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold">{p.user.name}</p>
                            {p.paid && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-green-100 text-green-700 border-none">已付款</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {p.items.map((cartItem, idx) => (
                                <span key={`${cartItem.item.id}-${idx}`} className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-0.5">
                                    {cartItem.item.name} x {cartItem.quantity} {renderSelectedAttributes(cartItem)}
                                </span>
                            ))}
                        </div>
                    </div>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-primary">${p.totalCost}</p>
                    </div>
                </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Sticky */}
      <div className="space-y-6">
        <div className="sticky top-24 space-y-6">
            {user?.uid === order.initiatorId && (
                <SummaryView order={order} />
            )}
            
            <Card className="overflow-hidden border-none shadow-xl ring-1 ring-black/5">
                <CardHeader className="bg-primary/10 border-b border-primary/10">
                    <CardTitle className="text-lg">結帳摘要</CardTitle>
                    <CardDescription>目前的團購總額</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">當前累積</span>
                        <span className="font-bold">${totalCost}</span>
                    </div>
                    {order.targetAmount && (
                        <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-xs">
                                <span>進度 {Math.round((totalCost / order.targetAmount) * 100)}%</span>
                                <span className="text-muted-foreground">目標 ${order.targetAmount}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (totalCost / order.targetAmount) * 100)}%` }} />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-6 pt-0">
                    {isParticipant ? (
                        <Button className="w-full bg-muted text-muted-foreground cursor-default" size="lg" disabled>
                            您已在團購中
                        </Button>
                    ) : (
                        <JoinOrderDialog order={order} onJoin={onJoinOrder} isJoining={isJoining} />
                    )}
                </CardFooter>
            </Card>

            <Card className="border-none bg-muted/30 shadow-sm">
                <CardHeader className="p-4">
                    <CardTitle className="text-sm">分享團購</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        {order.visibility === 'public' 
                            ? '此為公開團購，點擊下方連結複製網址分享給好友。' 
                            : '此為私人團購，只有擁有連結的人才能加入。'}
                    </p>
                    <Button variant="outline" className="w-full h-9 text-xs" onClick={handleShare}>
                        <Share2 className="mr-2 h-3.5 w-3.5" />
                        複製分享連結
                    </Button>
                </CardContent>
            </Card>
        </div>
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
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const composeOrder = async () => {
        if (!orderDoc || !availableItems || !participantsData || !statusUpdates || !firestore) return;

        setIsLoading(true);

        const initiatorSnap = await getDoc(doc(firestore, 'users', orderDoc.initiatorId));
        const initiator = initiatorSnap.exists() 
            ? { ...initiatorSnap.data(), id: initiatorSnap.id } as User
            : { id: orderDoc.initiatorId, name: orderDoc.initiatorName, avatarUrl: '' } as User;

        const participantsWithUsers = await Promise.all(
            participantsData.map(async (p) => {
                const userSnap = await getDoc(doc(firestore, 'users', p.id));
                const userData = userSnap.exists()
                    ? { ...userSnap.data(), id: userSnap.id } as User
                    : { id: p.id, name: '未知用戶', avatarUrl: '' } as User;
                
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

  const handleJoinOrder = async (items: CartItem[]) => {
    if (!firestore || !user || !composedOrder) {
      toast({ title: "無法加入訂單", variant: "destructive" });
      return;
    }
    
    setIsJoining(true);
    
    try {
        const totalCost = items.reduce((sum, ci) => {
             let itemPrice = ci.item.price;
             if (ci.selectedAttributes) {
                 Object.entries(ci.selectedAttributes).forEach(([attrId, val]) => {
                     const attr = ci.item.attributes?.find(a => a.id === attrId);
                     const opt = attr?.options.find(o => o.value === val);
                     if (opt) itemPrice += opt.price;
                 });
             }
             return sum + itemPrice * ci.quantity;
        }, 0);

        const participantData: Omit<Participant, 'user'> = {
          id: user.uid,
          totalCost,
          paid: false,
          items: items.map(ci => ({
            itemId: ci.item.id,
            itemName: ci.item.name,
            quantity: ci.quantity,
            itemPrice: ci.item.price,
            selectedAttributes: ci.selectedAttributes || {},
          }))
        };
        
        // 1. Add participant to subcollection
        await setDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id, 'participants', user.uid), participantData, {});

        // 2. Update participantIds array on the main order doc
        const newParticipantIds = Array.from(new Set([...(composedOrder.participantIds || []), user.uid]));
        await updateDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id), { participantIds: newParticipantIds });
        
        toast({ title: "成功加入團購！" });
    } catch (error) {
        console.error("Error joining order:", error);
        toast({ title: "加入失敗", description: "請稍後再試。", variant: "destructive" });
    } finally {
        setIsJoining(false);
    }
  };

  const handleUpdatePayment = async (userId: string, paid: boolean) => {
    if (!firestore || !id) return;
    try {
        await updateDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id, 'participants', userId), { paid });
        toast({ title: paid ? "標記為已付款" : "標記為未付款" });
    } catch (error) {
        toast({ title: "更新失敗", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (status: 'open' | 'closed' | 'archived') => {
    if (!firestore || !id) return;
    try {
        await updateDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id), { status });
        
        // Also add a status update timeline entry
        const statusMessages = {
            open: '訂單已重新開啟，歡迎加入！',
            closed: '團主已停止收單，正在處理中。',
            archived: '訂單已封存。'
        };
        
        await setDocumentNonBlocking(doc(collection(firestore, 'groupBuyOrders', id, 'statusUpdates')), {
            message: statusMessages[status],
            createdAt: new Date().toISOString(),
        }, {});
        
        toast({ title: "訂單狀態已更新" });
    } catch (error) {
        toast({ title: "更新失敗", variant: "destructive" });
    }
  };


  if (isLoading || !composedOrder) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">正在為您準備團購詳情...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
        <OrderDetailsDisplay 
            order={composedOrder} 
            onJoinOrder={handleJoinOrder} 
            onUpdatePayment={handleUpdatePayment}
            onUpdateStatus={handleUpdateStatus}
            isJoining={isJoining} 
        />
    </div>
  );
}
