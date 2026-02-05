'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, ShoppingCart, Package } from 'lucide-react';
import type { Order, Item, CartItem } from '@/lib/definitions';
import { Separator } from '../ui/separator';

type JoinOrderDialogProps = {
  order: Order;
  onJoin: (items: CartItem[]) => void;
  isJoining: boolean;
};

export default function JoinOrderDialog({ order, onJoin, isJoining }: JoinOrderDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  const addItemToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1, selectedAttributes: {} }];
    });
  };

  const removeItemFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.item.id !== itemId);
    });
  };

  const updateAttribute = (itemId: string, attrId: string, value: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.item.id === itemId
          ? {
              ...i,
              selectedAttributes: { ...i.selectedAttributes, [attrId]: value },
            }
          : i
      )
    );
  };

  const total = cart.reduce((sum, ci) => {
    let itemPrice = ci.item.price;
    // Add attribute prices
    if (ci.selectedAttributes) {
        Object.entries(ci.selectedAttributes).forEach(([attrId, val]) => {
            const attr = ci.item.attributes?.find(a => a.id === attrId);
            const opt = attr?.options.find(o => o.value === val);
            if (opt) itemPrice += opt.price;
        });
    }
    return sum + itemPrice * ci.quantity;
  }, 0);

  const handleConfirm = () => {
    onJoin(cart);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <ShoppingCart className="mr-2 h-5 w-5" />
          加入團購
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="flex h-[80vh] flex-col">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">加入 {order.name}</DialogTitle>
            <DialogDescription>選擇您想要訂購的項目及數量。</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-0">
            {/* Items List */}
            <ScrollArea className="flex-1 p-6 border-r">
                <div className="space-y-8">
                    {order.availableItems.map((item) => (
                        <div key={item.id} className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg">{item.name}</h4>
                                    <p className="text-primary font-bold text-lg">${item.price}</p>
                                </div>
                                <Button size="sm" onClick={() => addItemToCart(item)}>
                                    <Plus className="h-4 w-4 mr-1" /> 新增
                                </Button>
                            </div>

                            {item.attributes && item.attributes.length > 0 && (
                                <div className="space-y-4 pl-4 border-l-2 border-muted py-1">
                                    {item.attributes.map((attr) => (
                                        <div key={attr.id} className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{attr.name}</Label>
                                            <RadioGroup 
                                                className="flex flex-wrap gap-2"
                                                onValueChange={(val) => updateAttribute(item.id, attr.id, val)}
                                            >
                                                {attr.options.map((opt) => (
                                                    <div key={opt.id} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={opt.value} id={`opt-${item.id}-${opt.id}`} className="sr-only" />
                                                        <Label
                                                            htmlFor={`opt-${item.id}-${opt.id}`}
                                                            className="flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                                        >
                                                            {opt.value} {opt.price > 0 && `(+$${opt.price})`}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* My Selection Summary */}
            <div className="w-72 bg-muted/30 p-6 flex flex-col">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" /> 我的選擇
                </h4>
                <ScrollArea className="flex-1">
                    {cart.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center mt-10">尚未選擇任何項目</p>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((ci) => (
                                <div key={ci.item.id} className="text-sm">
                                    <div className="flex justify-between font-medium">
                                        <span>{ci.item.name}</span>
                                        <span>${ci.item.price * ci.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => removeItemFromCart(ci.item.id)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-4 text-center">{ci.quantity}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => addItemToCart(ci.item)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <Separator className="my-4" />
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>總計</span>
                    <span>${total}</span>
                </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-background border-t">
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={handleConfirm} disabled={cart.length === 0 || isJoining} size="lg" className="px-10">
                {isJoining ? "處理中..." : "確認加入"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
