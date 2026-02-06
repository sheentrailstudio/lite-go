'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Clock, 
    DollarSign, 
    Users, 
    Package, 
    Share2, 
    Loader2, 
    CheckCircle2, 
    Archive,
    Ban,
    AlertCircle,
    RefreshCw,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Item, User, CartItem, Order, GroupBuyOrderDocument, Participant, StatusUpdate } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import OrderStatusTracker from '@/components/orders/order-status-tracker';
import SummaryView from '@/components/orders/summary-view';
import ExportView from '@/components/orders/export-view';
import JoinOrderDialog from '@/components/orders/join-order-dialog';
import ErrorBoundary from '@/components/error-boundary';
import { useDoc, useCollection, useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDoc } from 'firebase/firestore';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, fadeInScale, staggerContainer, progressBar, heroParallax } from '@/lib/motion';


// ===== Skeleton Loading Components =====
function OrderDetailsSkeleton() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="grid gap-6 md:grid-cols-[1fr_300px] lg:gap-10">
        <div className="space-y-6">
          {/* Hero Skeleton */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-4 divide-x border-t">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center py-4 px-2">
                  <Skeleton className="h-4 w-4 mb-2" />
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Menu Grid Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-7 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===== Error State Component =====
function OrderNotFoundError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto py-20 px-4"
    >
      <Card className="max-w-md mx-auto text-center border-destructive/20">
        <CardHeader className="space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center"
          >
            <AlertCircle className="h-8 w-8 text-destructive" />
          </motion.div>
          <div>
            <CardTitle>找不到訂單</CardTitle>
            <CardDescription className="mt-2">
              此訂單可能已被刪除，或者您沒有權限查看。
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            返回首頁
          </Button>
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            重試
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// ===== Attribute Display Helper =====
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


// ===== Main Order Display Component =====
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
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const isInitiator = user?.uid === order.initiatorId;
  const isParticipant = order.participants.some(p => p.id === user?.uid);
  
  const orderUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: order.name,
          text: `快來加入「${order.name}」團購！`,
          url: orderUrl,
        });
      } else {
        await navigator.clipboard.writeText(orderUrl);
        toast({
          title: '已複製連結！',
          description: '訂單的分享連結已複製到您的剪貼簿。',
        });
      }
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: '分享失敗',
          description: '請手動複製網址分享。',
          variant: 'destructive'
        });
      }
    }
  };

  const handleStatusUpdate = async (status: 'open' | 'closed' | 'archived') => {
    setIsStatusUpdating(true);
    try {
      await onUpdateStatus(status);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Memoized calculations
  const totalCost = useMemo(() => 
    order.participants.reduce((sum, p) => sum + p.totalCost, 0), 
    [order.participants]
  );

  const paidCount = useMemo(() =>
    order.participants.filter(p => p.paid).length,
    [order.participants]
  );

  const progressPercent = useMemo(() => 
    order.targetAmount ? Math.min(100, (totalCost / order.targetAmount) * 100) : 0,
    [totalCost, order.targetAmount]
  );

  const sortedItemsSummary = useMemo(() => {
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

    return Array.from(itemsSummary.values()).sort((a,b) => b.totalQuantity - a.totalQuantity);
  }, [order.participants]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="grid gap-6 md:grid-cols-[1fr_300px] lg:gap-10"
    >
      <div className="space-y-6">
        {/* Hero Card with Parallax */}
        <motion.div 
          variants={fadeInScale}
          className="overflow-hidden rounded-2xl border bg-card shadow-sm text-foreground"
        >
          <div className="relative h-48 w-full overflow-hidden">
            <motion.div
              initial={heroParallax.initial}
              animate={heroParallax.animate}
              className="absolute inset-0"
            >
              <Image
                src={order.image?.src || `https://picsum.photos/seed/${order.id}/800/400`}
                alt={order.name}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-3xl font-black tracking-tight">{order.name}</h1>
                <p className="mt-1 text-sm opacity-90">{order.description}</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-2"
              >
                <Badge className={cn(
                  "border-none px-3 py-1",
                  order.status === 'open' 
                    ? "bg-primary text-primary-foreground animate-pulse" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {order.status === 'open' ? '🔴 進行中' : order.status === 'closed' ? '已截單' : '已封存'}
                </Badge>
              </motion.div>
            </div>
          </div>
          
          {/* Admin Controls */}
          <AnimatePresence>
            {isInitiator && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-4 bg-muted/10 border-t"
              >
                <Sparkles className="h-4 w-4 text-primary ml-1" />
                <span className="text-xs font-bold text-muted-foreground uppercase mr-auto">管理員工具</span>
                {order.status === 'open' ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10" 
                    onClick={() => handleStatusUpdate('closed')}
                    disabled={isStatusUpdating}
                  >
                    {isStatusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1.5" />}
                    停止收單
                  </Button>
                ) : order.status === 'closed' ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8" 
                    onClick={() => handleStatusUpdate('open')}
                    disabled={isStatusUpdating}
                  >
                    {isStatusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                    重新開啟
                  </Button>
                ) : null}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8" 
                  onClick={() => handleStatusUpdate('archived')}
                  disabled={isStatusUpdating}
                >
                  <Archive className="h-3.5 w-3.5 mr-1.5" /> 封存訂單
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 divide-x border-t bg-muted/20">
            {[
              { label: '參與者', value: order.participants.length, icon: Users },
              { label: '目標金額', value: order.targetAmount ? `$${order.targetAmount}` : '無限制', icon: DollarSign },
              { label: '截止時間', value: order.deadline ? format(parseISO(order.deadline), 'MM/dd HH:mm') : '未設定', icon: Clock },
              { label: '可選項目', value: order.availableItems.length, icon: Package },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-center justify-center py-4 px-2 text-center"
              >
                <stat.icon className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-sm font-bold">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        <motion.div variants={fadeUp}>
          <OrderStatusTracker order={order} />
        </motion.div>
        
        {/* Menu Grid */}
        <motion.div variants={fadeUp} className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 px-1">
            <Package className="h-5 w-5 text-primary" /> 團購菜單
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {order.availableItems.map((item, index) => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                custom={index}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className="overflow-hidden border-none bg-card shadow-sm hover:shadow-md transition-shadow">
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
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Participant Activity */}
        <motion.div variants={fadeUp}>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">參與者動態</CardTitle>
                {isInitiator && paidCount > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-none">
                    {paidCount}/{order.participants.length} 已付款
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <AnimatePresence mode="popLayout">
                {order.participants.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-10"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground italic">目前還沒有人加入，快來成為第一個吧！</p>
                  </motion.div>
                ) : (
                  order.participants.map((p, index) => (
                    <motion.div 
                      key={p.user.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start justify-between border-b pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-4">
                        {isInitiator && (
                          <div className="flex flex-col items-center gap-1 mr-1">
                            <Checkbox 
                              id={`paid-${p.id}`} 
                              checked={p.paid} 
                              onCheckedChange={(checked) => onUpdatePayment(p.id, checked as boolean)}
                            />
                            <Label htmlFor={`paid-${p.id}`} className="text-[10px] text-muted-foreground uppercase font-bold">
                              已付
                            </Label>
                          </div>
                        )}
                        <Avatar className="h-12 w-12 border-2 border-background ring-2 ring-muted">
                          <AvatarImage src={p.user.avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {p.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{p.user.name}</p>
                            <AnimatePresence>
                              {p.paid && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                >
                                  <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-green-100 text-green-700 border-none">
                                    已付款
                                  </Badge>
                                </motion.div>
                              )}
                            </AnimatePresence>
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
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sidebar Sticky */}
      <motion.div variants={fadeUp} className="space-y-6">
        <div className="sticky top-24 space-y-6">
          {user?.uid === order.initiatorId && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <SummaryView order={order} />
              <ExportView order={order} />
            </motion.div>
          )}
          
          {/* Checkout Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="overflow-hidden border-none shadow-xl ring-1 ring-black/5 bg-card text-foreground">
              <CardHeader className="bg-primary/10 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  結帳摘要
                </CardTitle>
                <CardDescription>目前的團購總額</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">當前累積</span>
                  <motion.span 
                    key={totalCost}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-bold text-xl"
                  >
                    ${totalCost}
                  </motion.span>
                </div>
                {order.targetAmount && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs">
                      <span>進度 {Math.round(progressPercent)}%</span>
                      <span className="text-muted-foreground">目標 ${order.targetAmount}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-6 pt-0">
                {order.status !== 'open' ? (
                  <Button className="w-full bg-muted text-muted-foreground cursor-not-allowed" size="lg" disabled>
                    訂單已關閉
                  </Button>
                ) : isParticipant ? (
                  <Button className="w-full bg-muted text-muted-foreground cursor-default" size="lg" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    您已在團購中
                  </Button>
                ) : (
                  <JoinOrderDialog order={order} onJoin={onJoinOrder} isJoining={isJoining} />
                )}
              </CardFooter>
            </Card>
          </motion.div>

          {/* Share Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-none bg-muted/30 shadow-sm text-foreground">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">分享團購</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {order.visibility === 'public' 
                    ? '此為公開團購，點擊下方連結複製網址分享給好友。' 
                    : '此為私人團購，只有擁有連結的人才能加入。'}
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" className="w-full h-9 text-xs gap-2" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5" />
                    複製分享連結
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ===== Main Page Component =====
export default function OrderDetailsPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const orderRef = useMemoFirebase(() => firestore ? doc(firestore, 'groupBuyOrders', id) : null, [firestore, id]);
  const itemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'groupBuyOrders', id, 'items') : null, [firestore, id]);
  const participantsRef = useMemoFirebase(() => firestore ? collection(firestore, 'groupBuyOrders', id, 'participants') : null, [firestore, id]);
  const statusUpdatesRef = useMemoFirebase(() => firestore ? collection(firestore, 'groupBuyOrders', id, 'statusUpdates') : null, [firestore, id]);
  
  const { data: orderDoc, isLoading: isLoadingOrder, error: orderError } = useDoc<GroupBuyOrderDocument>(orderRef);
  const { data: availableItems, isLoading: isLoadingItems, error: itemsError } = useCollection<Item>(itemsRef);
  const { data: participantsData, isLoading: isLoadingParticipants, error: participantsError } = useCollection<Omit<Participant, 'user'>>(participantsRef);
  const { data: statusUpdates, isLoading: isLoadingStatus, error: statusError } = useCollection<StatusUpdate>(statusUpdatesRef);

  const [composedOrder, setComposedOrder] = useState<Order | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const isLoading = isLoadingOrder || isLoadingItems || isLoadingParticipants || isLoadingStatus || isComposing || isUserLoading;
  const hasError = orderError || itemsError || participantsError || statusError || composeError;

  // Compose order from subcollections
  useEffect(() => {
    const composeOrder = async () => {
      if (!orderDoc || !availableItems || !participantsData || !statusUpdates || !firestore) return;

      setIsComposing(true);
      setComposeError(null);

      try {
        // Fetch initiator data with error handling
        let initiator: User;
        try {
          const initiatorSnap = await getDoc(doc(firestore, 'users', orderDoc.initiatorId));
          initiator = initiatorSnap.exists() 
            ? { ...initiatorSnap.data(), id: initiatorSnap.id } as User
            : { id: orderDoc.initiatorId, name: orderDoc.initiatorName, avatarUrl: '' } as User;
        } catch (e) {
          console.warn('Failed to fetch initiator, using fallback:', e);
          initiator = { id: orderDoc.initiatorId, name: orderDoc.initiatorName, avatarUrl: '' } as User;
        }

        // Hydrate participants with user data
        const participantsWithUsers = await Promise.all(
          participantsData.map(async (p) => {
            let userData: User;
            try {
              const userSnap = await getDoc(doc(firestore, 'users', p.id));
              userData = userSnap.exists()
                ? { ...userSnap.data(), id: userSnap.id } as User
                : { id: p.id, name: '未知用戶', avatarUrl: '' } as User;
            } catch (e) {
              console.warn(`Failed to fetch user ${p.id}, using fallback:`, e);
              userData = { id: p.id, name: '未知用戶', avatarUrl: '' } as User;
            }
            
            const hydratedItems = (p.items || []).map(cartItem => {
              const item = availableItems.find(i => i.id === (cartItem as any).itemId);
              return {
                ...cartItem,
                item: item || { id: (cartItem as any).itemId, name: (cartItem as any).itemName || '已刪除項目', price: (cartItem as any).itemPrice || 0 } as Item,
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
      } catch (error) {
        console.error('Error composing order:', error);
        setComposeError('載入訂單資料時發生錯誤');
      } finally {
        setIsComposing(false);
      }
    };

    if (!isLoadingOrder && !isLoadingItems && !isLoadingParticipants && !isLoadingStatus) {
      composeOrder();
    }
  }, [orderDoc, availableItems, participantsData, statusUpdates, firestore, isLoadingOrder, isLoadingItems, isLoadingParticipants, isLoadingStatus, retryKey]);

  const handleJoinOrder = useCallback(async (items: CartItem[]) => {
    if (!firestore || !user || !composedOrder) {
      toast({ title: "無法加入訂單", description: "請先登入", variant: "destructive" });
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
      
      toast({ 
        title: "🎉 成功加入團購！",
        description: `您已成功加入「${composedOrder.name}」`,
      });
    } catch (error) {
      console.error("Error joining order:", error);
      toast({ 
        title: "加入失敗", 
        description: error instanceof Error ? error.message : "請稍後再試。", 
        variant: "destructive" 
      });
    } finally {
      setIsJoining(false);
    }
  }, [firestore, user, composedOrder, id, toast]);

  const handleUpdatePayment = useCallback(async (userId: string, paid: boolean) => {
    if (!firestore || !id) return;
    try {
      await updateDocumentNonBlocking(doc(firestore, 'groupBuyOrders', id, 'participants', userId), { paid });
      toast({ title: paid ? "✅ 標記為已付款" : "標記為未付款" });
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({ title: "更新失敗", variant: "destructive" });
    }
  }, [firestore, id, toast]);

  const handleUpdateStatus = useCallback(async (status: 'open' | 'closed' | 'archived') => {
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
      console.error("Error updating status:", error);
      toast({ title: "更新失敗", variant: "destructive" });
    }
  }, [firestore, id, toast]);

  const handleRetry = useCallback(() => {
    setComposeError(null);
    setRetryKey(k => k + 1);
  }, []);

  // Error state
  if (hasError && !isLoading) {
    return <OrderNotFoundError onRetry={handleRetry} />;
  }

  // Loading state
  if (isLoading || !composedOrder) {
    return <OrderDetailsSkeleton />;
  }

  return (
    <ErrorBoundary onReset={handleRetry}>
      <div className="container mx-auto py-10 px-4">
        <OrderDetailsDisplay 
          order={composedOrder} 
          onJoinOrder={handleJoinOrder} 
          onUpdatePayment={handleUpdatePayment}
          onUpdateStatus={handleUpdateStatus}
          isJoining={isJoining} 
        />
      </div>
    </ErrorBoundary>
  );
}
