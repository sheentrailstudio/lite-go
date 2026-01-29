'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Item, Order, Participant, CartItem } from '@/lib/definitions';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { calculateCartItemTotal } from '@/lib/order-logic';

interface EditParticipantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  participant: Participant;
  isInitiatorEditing?: boolean; // Is the initiator editing someone else's order?
}

export default function EditParticipantDialog({
  isOpen,
  onClose,
  order,
  participant,
  isInitiatorEditing = false,
}: EditParticipantDialogProps) {
  const firestore = useFirestore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with participant's items
  useEffect(() => {
    if (isOpen && participant) {
      // Deep copy to avoid mutating props
      setItems(JSON.parse(JSON.stringify(participant.items)));
    }
  }, [isOpen, participant]);

  const handleQuantityChange = (index: number, change: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const newQuantity = Math.max(0, item.quantity + change);
    
    // Check max quantity constraint
    if (change > 0 && item.item.maxQuantity && newQuantity > item.item.maxQuantity) {
        toast({ title: "庫存不足", variant: "destructive" });
        return;
    }

    item.quantity = newQuantity;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);

    try {
      const filteredItems = items.filter(i => i.quantity > 0);
      const totalCost = filteredItems.reduce((sum, item) => sum + calculateCartItemTotal(item), 0);

      // Prepare data for Firestore
      // Note: We need to convert full Item objects back to simplified structure if that's how it's stored
      // But based on previous code, we store a simplified version.
      // Let's look at definitions.ts logic again. 
      // Actually OrderDetailsPage hydrated the items. We need to save simplified version.
      
      const simplifiedItems = filteredItems.map(cartItem => ({
          itemId: cartItem.item.id,
          quantity: cartItem.quantity,
          selectedAttributes: cartItem.selectedAttributes || {},
          // We might store snapshots of price/name for history, 
          // but for now let's stick to refs
      }));

      const participantRef = doc(firestore, 'groupBuyOrders', order.id, 'participants', participant.id);

      if (simplifiedItems.length === 0) {
          // If no items left, remove participant completely?
          // Or just clear items? Let's ask user or just delete if empty.
          // For now, let's just clear items.
          if (confirm('確定要移除所有商品嗎？這將會取消此訂單。')) {
               await deleteDocumentNonBlocking(participantRef);
               
               // Also remove from participantIds array in parent order
               const orderRef = doc(firestore, 'groupBuyOrders', order.id);
               await updateDocumentNonBlocking(orderRef, {
                   participantIds: arrayRemove(participant.id)
               });
               
               toast({ title: "訂單已取消" });
               onClose();
          }
      } else {
          await updateDocumentNonBlocking(participantRef, {
              items: simplifiedItems,
              totalCost: totalCost
          });
          toast({ title: "訂單已更新" });
          onClose();
      }

    } catch (error) {
      console.error(error);
      toast({ title: "更新失敗", description: "請稍後再試", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotal = items.reduce((sum, item) => sum + calculateCartItemTotal(item), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isInitiatorEditing ? `修改 ${participant.user.name} 的訂單` : '修改我的訂單'}</DialogTitle>
          <DialogDescription>
            調整數量或移除項目。新增項目請至主選單選擇。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
                {items.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        購物車是空的
                    </div>
                )}
                {items.map((cartItem, index) => (
                    <div key={`${cartItem.item.id}-${index}`} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div className="flex-1">
                            <h4 className="font-medium">{cartItem.item.name}</h4>
                            <div className="text-sm text-muted-foreground">
                                {cartItem.selectedAttributes && Object.entries(cartItem.selectedAttributes).map(([key, val]) => (
                                    <span key={key} className="mr-2">{val}</span>
                                ))}
                            </div>
                            <div className="text-sm font-semibold mt-1">
                                ${calculateCartItemTotal({ ...cartItem, quantity: 1 })} x {cartItem.quantity} = ${calculateCartItemTotal(cartItem)}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, -1)}>
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{cartItem.quantity}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, 1)}>
                                <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-2" onClick={() => handleRemoveItem(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="text-lg font-bold">
                總計: <span className="text-primary">${currentTotal}</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">取消</Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                    {isSaving ? '儲存中...' : '儲存變更'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
