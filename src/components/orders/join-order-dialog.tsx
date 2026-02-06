'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Minus, ShoppingCart, Package, Loader2, AlertCircle, Check, Sparkles } from 'lucide-react';
import type { Order, Item, CartItem } from '@/lib/definitions';
import { Separator } from '../ui/separator';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { cartItemPop, fadeUp, staggerContainer, fadeInScale } from '@/lib/motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type JoinOrderDialogProps = {
  order: Order;
  onJoin: (items: CartItem[]) => void;
  isJoining: boolean;
};

// Animated number component for smooth total transitions
function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  
  useState(() => {
    const controls = animate(motionValue, value, {
      duration: 0.5,
      ease: 'easeOut',
    });
    return () => controls.stop();
  });

  // Update animation when value changes
  useMemo(() => {
    animate(motionValue, value, {
      duration: 0.5,
      ease: 'easeOut',
    });
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}

// Individual cart item component with animations
function CartItemCard({ 
  cartItem, 
  onAdd, 
  onRemove 
}: { 
  cartItem: CartItem; 
  onAdd: () => void; 
  onRemove: () => void;
}) {
  const itemTotal = useMemo(() => {
    let price = cartItem.item.price;
    if (cartItem.selectedAttributes) {
      Object.entries(cartItem.selectedAttributes).forEach(([attrId, val]) => {
        const attr = cartItem.item.attributes?.find(a => a.id === attrId);
        const opt = attr?.options.find(o => o.value === val);
        if (opt) price += opt.price;
      });
    }
    return price * cartItem.quantity;
  }, [cartItem]);

  return (
    <motion.div
      layout
      variants={cartItemPop}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-background rounded-xl p-3 border shadow-sm"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-medium text-sm">{cartItem.item.name}</span>
          {cartItem.selectedAttributes && Object.keys(cartItem.selectedAttributes).length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {Object.entries(cartItem.selectedAttributes).map(([attrId, val]) => {
                const attr = cartItem.item.attributes?.find(a => a.id === attrId);
                return attr ? `${attr.name}: ${val}` : val;
              }).join(', ')}
            </p>
          )}
        </div>
        <motion.span 
          key={itemTotal}
          initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
          animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
          className="font-bold text-sm"
        >
          ${itemTotal}
        </motion.span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 rounded-full" 
          onClick={onRemove}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <motion.span 
          key={cartItem.quantity}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="w-8 text-center font-bold"
        >
          {cartItem.quantity}
        </motion.span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 rounded-full" 
          onClick={onAdd}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

// Menu item component
function MenuItem({ 
  item, 
  cartQuantity,
  onAddToCart, 
  onUpdateAttribute 
}: { 
  item: Item;
  cartQuantity: number;
  onAddToCart: () => void;
  onUpdateAttribute: (attrId: string, value: string) => void;
}) {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  
  const handleAttributeChange = (attrId: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [attrId]: value }));
    onUpdateAttribute(attrId, value);
  };

  const hasImage = item.images && item.images.length > 0;

  return (
    <motion.div 
      variants={fadeUp}
      className="group relative rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20"
    >
      <div className="flex gap-4">
        {/* Item Image */}
        {hasImage && (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            <Image 
              src={item.images![0].src} 
              alt={item.name} 
              fill 
              className="object-cover" 
            />
          </div>
        )}
        
        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-bold text-base">{item.name}</h4>
              <p className="text-primary font-black text-lg">${item.price}</p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="sm" 
                onClick={onAddToCart}
                className="gap-1 rounded-full shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">加入</span>
              </Button>
            </motion.div>
          </div>

          {/* Cart quantity indicator */}
          <AnimatePresence>
            {cartQuantity > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium"
              >
                <Check className="h-3 w-3" />
                已加入 {cartQuantity} 個
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Attributes */}
      {item.attributes && item.attributes.length > 0 && (
        <div className="mt-4 space-y-3 pl-0 md:pl-24">
          {item.attributes.map((attr) => (
            <div key={attr.id} className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {attr.name}
              </Label>
              <RadioGroup 
                className="flex flex-wrap gap-2"
                value={selectedAttributes[attr.id]}
                onValueChange={(val) => handleAttributeChange(attr.id, val)}
              >
                {attr.options.map((opt) => (
                  <div key={opt.id} className="flex items-center">
                    <RadioGroupItem 
                      value={opt.value} 
                      id={`opt-${item.id}-${opt.id}`} 
                      className="sr-only peer" 
                    />
                    <Label
                      htmlFor={`opt-${item.id}-${opt.id}`}
                      className={cn(
                        "flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-all",
                        "hover:bg-accent hover:border-primary/30",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary peer-data-[state=checked]:font-medium"
                      )}
                    >
                      {opt.value} {opt.price > 0 && <span className="ml-1 text-xs opacity-70">(+${opt.price})</span>}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function JoinOrderDialog({ order, onJoin, isJoining }: JoinOrderDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [pendingAttributes, setPendingAttributes] = useState<Record<string, Record<string, string>>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate total with memoization
  const { total, itemCount } = useMemo(() => {
    let sum = 0;
    let count = 0;
    cart.forEach(ci => {
      let itemPrice = ci.item.price;
      if (ci.selectedAttributes) {
        Object.entries(ci.selectedAttributes).forEach(([attrId, val]) => {
          const attr = ci.item.attributes?.find(a => a.id === attrId);
          const opt = attr?.options.find(o => o.value === val);
          if (opt) itemPrice += opt.price;
        });
      }
      sum += itemPrice * ci.quantity;
      count += ci.quantity;
    });
    return { total: sum, itemCount: count };
  }, [cart]);

  // Validate required attributes
  const validateAndAddItem = useCallback((item: Item) => {
    setValidationError(null);
    
    // Check if item has required attributes
    if (item.attributes && item.attributes.length > 0) {
      const itemAttrs = pendingAttributes[item.id] || {};
      const missingAttrs = item.attributes.filter(attr => !itemAttrs[attr.id]);
      
      if (missingAttrs.length > 0) {
        setValidationError(`請先選擇「${missingAttrs[0].name}」再加入購物車`);
        return;
      }
    }

    // Add to cart with selected attributes
    const selectedAttrs = pendingAttributes[item.id] || {};
    const attrKey = JSON.stringify(selectedAttrs);
    
    setCart(prev => {
      const existingIndex = prev.findIndex(
        i => i.item.id === item.id && JSON.stringify(i.selectedAttributes) === attrKey
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { 
          ...updated[existingIndex], 
          quantity: updated[existingIndex].quantity + 1 
        };
        return updated;
      }
      
      return [...prev, { 
        item, 
        quantity: 1, 
        selectedAttributes: { ...selectedAttrs }
      }];
    });
  }, [pendingAttributes]);

  const updatePendingAttribute = useCallback((itemId: string, attrId: string, value: string) => {
    setPendingAttributes(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [attrId]: value,
      }
    }));
    setValidationError(null);
  }, []);

  const addItemQuantity = useCallback((cartItem: CartItem) => {
    const attrKey = JSON.stringify(cartItem.selectedAttributes);
    setCart(prev => prev.map(i => 
      i.item.id === cartItem.item.id && JSON.stringify(i.selectedAttributes) === attrKey
        ? { ...i, quantity: i.quantity + 1 }
        : i
    ));
  }, []);

  const removeItemFromCart = useCallback((cartItem: CartItem) => {
    const attrKey = JSON.stringify(cartItem.selectedAttributes);
    setCart(prev => {
      const existing = prev.find(
        i => i.item.id === cartItem.item.id && JSON.stringify(i.selectedAttributes) === attrKey
      );
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          i.item.id === cartItem.item.id && JSON.stringify(i.selectedAttributes) === attrKey
            ? { ...i, quantity: i.quantity - 1 }
            : i
        );
      }
      return prev.filter(i => 
        !(i.item.id === cartItem.item.id && JSON.stringify(i.selectedAttributes) === attrKey)
      );
    });
  }, []);

  const getCartQuantity = useCallback((itemId: string) => {
    return cart.filter(c => c.item.id === itemId).reduce((sum, c) => sum + c.quantity, 0);
  }, [cart]);

  const handleConfirm = () => {
    if (cart.length === 0) {
      setValidationError('請至少選擇一個項目');
      return;
    }
    onJoin(cart);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setCart([]);
      setPendingAttributes({});
      setValidationError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button className="w-full gap-2 shadow-lg" size="lg">
            <ShoppingCart className="h-5 w-5" />
            加入團購
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-[85vh] flex-col"
        >
          <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                加入 {order.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                選擇您想要訂購的項目及數量，確認後即可加入此團購。
              </DialogDescription>
            </motion.div>
          </DialogHeader>

          {/* Validation Error */}
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6"
              >
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-hidden flex">
            {/* Items List */}
            <ScrollArea className="flex-1 p-6">
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {order.availableItems.map((item) => (
                  <MenuItem
                    key={item.id}
                    item={item}
                    cartQuantity={getCartQuantity(item.id)}
                    onAddToCart={() => validateAndAddItem(item)}
                    onUpdateAttribute={(attrId, val) => updatePendingAttribute(item.id, attrId, val)}
                  />
                ))}
              </motion.div>
            </ScrollArea>

            {/* Cart Sidebar */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-80 bg-muted/30 border-l flex flex-col"
            >
              <div className="p-4 border-b bg-background/50">
                <h4 className="font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  我的選擇
                  <AnimatePresence>
                    {itemCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold"
                      >
                        {itemCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </h4>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                <AnimatePresence mode="popLayout">
                  {cart.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        尚未選擇任何項目
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        點擊「加入」開始選購
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((ci, index) => (
                        <CartItemCard
                          key={`${ci.item.id}-${JSON.stringify(ci.selectedAttributes)}`}
                          cartItem={ci}
                          onAdd={() => addItemQuantity(ci)}
                          onRemove={() => removeItemFromCart(ci)}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>

              {/* Total Section */}
              <div className="p-4 border-t bg-background">
                <Separator className="mb-4" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">總計</span>
                  <motion.span 
                    key={total}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-black text-primary"
                  >
                    ${total}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </div>

          <DialogFooter className="p-4 bg-background border-t">
            <Button 
              variant="ghost" 
              onClick={() => handleOpenChange(false)}
              disabled={isJoining}
            >
              取消
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleConfirm} 
                disabled={cart.length === 0 || isJoining} 
                size="lg" 
                className="px-10 gap-2 shadow-lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    處理中...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    確認加入 (${total})
                  </>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
