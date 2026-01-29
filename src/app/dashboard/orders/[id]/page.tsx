'use client';

import { notFound, useRouter } from 'next/navigation';
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
import { Clock, DollarSign, Users, Package, Share2, Globe, Lock, Loader2, Edit, CalendarDays, MoreHorizontal } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Item, User, CartItem, Order, GroupBuyOrderDocument, Participant, StatusUpdate } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import OrderStatusTracker from '@/components/orders/order-status-tracker';
import EditParticipantDialog from '@/components/orders/edit-participant-dialog';
import EditOrderSettingsDialog from '@/components/orders/edit-order-settings-dialog';
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

  return <span className="text-xs text-muted-foreground">({attributeText})</span>;
};

// 抽離出的選單元件，避免 JSX 嵌套過深導致解析錯誤
const ParticipantActionMenu = ({ 
    userId, 
    onEdit 
}: { 
    userId: string, 
    onEdit: (id: string) => void 
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>管理訂單</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(userId)}>
                    <Edit className="mr-2 h-4 w-4" /> 修改內容
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                    踢出名單
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

function OrderDetailsDisplay({ order, onJoinOrder }: { order: Order, onJoinOrder: () => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

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
  const isInitiator = user?.uid === order.initiatorId;

  const totalCost = order.participants.reduce((sum, p) => sum + p.totalCost, 0);
  const myTotalCost = isParticipant ? order.participants.find(p => p.id === user?.uid)?.totalCost || 0 : 0;

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

  // Dialog State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const handleJoin = () => {
    onJoinOrder();
  };

  const handleEditOrder = () => {
      setIsSettingsDialogOpen(true);
  }

  const handleEditMyOrder = () => {
      const myParticipant = order.participants.find(p => p.id === user?.uid);
      if (myParticipant) {
          setEditingParticipant(myParticipant);
          setIsEditDialogOpen(true);
      }
  }

  const handleEditParticipant = (participantId: string) => {
      const targetParticipant = order.participants.find(p => p.id === participantId);
      if (targetParticipant) {
          setEditingParticipant(targetParticipant);
          setIsEditDialogOpen(true);
      }
  }

  return (
    <div className="space-y-6 pb-20">
      <EditParticipantDialog 
        isOpen={isEditDialogOpen}
        onClose={() => {
            setIsEditDialogOpen(false);
            setEditingParticipant(null);
        }}
        order={order}
        participant={editingParticipant!}
        isInitiatorEditing={editingParticipant?.id !== user?.uid}
      />
      
      <EditOrderSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        order={order}
      />

      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <Badge variant={order.status === 'open' ? 'default' : 'secondary'} className="capitalize">
                    {order.status === 'open' ? '進行中' : '已結束'}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1.5 py-0.5 capitalize text-muted-foreground">
                    {order.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {order.visibility === 'public' ? '公開' : '私人'}
                </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{order.name}</h1>
            <p className="text-muted-foreground max-w-2xl">{order.description}</p>
        </div>
        <div className="flex items-center gap-2">
            {isInitiator && (
                <Button variant="outline" size="sm" onClick={handleEditOrder}>
                    <Edit className="mr-2 h-4 w-4" /> 編輯團購
                </Button>
            )}
             <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-muted/40 border-none shadow-none">
            <CardContent className="p-4 flex flex-row items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium">截止日期</p>
                    <p className="text-sm font-semibold">
                        {order.deadline ? format(parseISO(order.deadline), 'MM/dd HH:mm') : '無期限'}
                    </p>
                </div>
            </CardContent>
        </Card>
        <Card className="bg-muted/40 border-none shadow-none">
            <CardContent className="p-4 flex flex-row items-center gap-4">
                 <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <Users className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium">參與人數</p>
                    <p className="text-sm font-semibold">
                        {order.participants.length} 
                        {order.maxParticipants ? ` / ${order.maxParticipants}` : ''}
                    </p>
                </div>
            </CardContent>
        </Card>
        <Card className="bg-muted/40 border-none shadow-none">
             <CardContent className="p-4 flex flex-row items-center gap-4">
                 <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <DollarSign className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium">目前的金額</p>
                    <p className="text-sm font-semibold">${totalCost}</p>
                </div>
            </CardContent>
        </Card>
        <Card className="bg-muted/40 border-none shadow-none">
            <CardContent className="p-4 flex flex-row items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <Package className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium">目標金額</p>
                    <p className="text-sm font-semibold">
                        {order.targetAmount ? `$${order.targetAmount}` : '無目標'}
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        
        {/* Left Column */}
        <div className="space-y-8">
            {/* Status Tracker */}
            <OrderStatusTracker order={order} />

            {/* Available Items */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">團購項目</h2>
                    <span className="text-sm text-muted-foreground">{order.availableItems.length} 個項目</span>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                    {order.availableItems.map(item => (
                        <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                                <div className="flex">
                                     {item.images && item.images.length > 0 ? (
                                        <div className="w-1/3 relative aspect-square">
                                            <Image src={item.images[0].src as string} alt={item.name} fill className="object-cover" />
                                        </div>
                                     ) : (
                                         <div className="w-1/3 bg-muted flex items-center justify-center aspect-square">
                                             <Package className="h-8 w-8 text-muted-foreground/50" />
                                         </div>
                                     )}
                                     <div className="flex-1 p-3 flex flex-col justify-between">
                                         <div>
                                            <h3 className="font-medium line-clamp-2">{item.name}</h3>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {item.attributes?.map(attr => (
                                                    <span key={attr.id} className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-gray-500/10">
                                                        {attr.name}
                                                    </span>
                                                ))}
                                            </div>
                                         </div>
                                         <div className="flex items-center justify-between mt-2">
                                             <span className="font-bold text-lg">${item.price}</span>
                                             {item.maxQuantity && <span className="text-xs text-muted-foreground">剩 {item.maxQuantity}</span>}
                                         </div>
                                     </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            
            <Separator />

            {/* Participants List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                     <h2 className="text-xl font-semibold tracking-tight">參與者名單</h2>
                </div>
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {order.participants.map(p => (
                            <div key={p.user.id} className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-start gap-3">
                                <Avatar className="mt-0.5">
                                    <AvatarImage src={p.user.avatarUrl} />
                                    <AvatarFallback>{p.user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">{p.user.name}</p>
                                        {p.user.id === order.initiatorId && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">團主</Badge>}
                                    </div>
                                    <div className="mt-1 space-y-1">
                                        {p.items.map((cartItem, idx) => (
                                            <div key={`${cartItem.item.id}-${idx}`} className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                <span className="w-4 h-4 flex items-center justify-center bg-muted rounded-full text-[10px] font-medium">{cartItem.quantity}</span>
                                                <span>{cartItem.item.name}</span>
                                                {renderSelectedAttributes(cartItem)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-semibold text-sm">${p.totalCost}</p>
                                    {isInitiator && (
                                         <ParticipantActionMenu userId={p.user.id} onEdit={handleEditParticipant} />
                                    )}
                                </div>
                            </div>
                            ))}
                            {order.participants.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    目前還沒有人參加，快來搶頭香！
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Item Breakdown Accordion */}
             <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">統計詳情</h2>
                <Card>
                    <CardContent className="p-0">
                        <Accordion type="single" collapsible className="w-full">
                        {sortedItemsSummary.map(({ item, totalQuantity, participants }) => (
                            <AccordionItem value={item.id} key={item.id} className="border-b last:border-0 px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex justify-between w-full pr-4 items-center">
                                <span className="font-medium text-sm">{item.name}</span>
                                <Badge variant="secondary">{totalQuantity}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 pb-3">
                                {participants.map(p => (
                                    <li key={p.user.id} className="flex items-center justify-between text-sm pl-2 border-l-2 border-muted">
                                    <span className="text-muted-foreground">{p.user.name}</span>
                                    <span>x {p.quantity}</span>
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
        </div>

        {/* Right Column (Sticky) */}
        <div className="space-y-6">
            <Card className="border-2 border-primary/10 shadow-lg sticky top-6">
                <CardHeader className="bg-muted/20 pb-4">
                    <CardTitle className="text-lg">您的訂單</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4">
                    {isParticipant ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                您已加入此團購
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">您的總金額</span>
                                <span className="font-bold text-xl">${myTotalCost}</span>
                            </div>
                            <Button className="w-full" variant="outline" onClick={handleEditMyOrder}>
                                修改我的訂單
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                {order.status === 'open' ? '選擇您想要的商品並加入！' : '此團購已結束。'}
                            </div>
                            <Button 
                                className="w-full" 
                                size="lg" 
                                disabled={order.status !== 'open' || (order.maxParticipants != null && order.participants.length >= order.maxParticipants)} 
                                onClick={handleJoin}
                            >
                                {(order.maxParticipants != null && order.participants.length >= order.maxParticipants) ? "名額已滿" : "立即加入"}
                            </Button>
                        </div>
                    )}
                    
                    <Separator />
                    
                    <div className="space-y-2">
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">全團小計</span>
                            <span>${totalCost}</span>
                        </div>
                         <div className="flex items-center justify-between text-sm font-medium">
                            <span>全團總計</span>
                            <span className="text-primary">${totalCost}</span>
                        </div>
                    </div>
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
    
    if (composedOrder.status !== 'open') {
         toast({ title: "訂單已結束", variant: "destructive" });
         return;
    }

    if (composedOrder.maxParticipants && composedOrder.participants.length >= composedOrder.maxParticipants) {
        toast({ title: "名額已滿", variant: "destructive" });
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
