'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Order } from '@/lib/definitions';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EditOrderSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

export default function EditOrderSettingsDialog({
  isOpen,
  onClose,
  order,
}: EditOrderSettingsDialogProps) {
  const firestore = useFirestore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    maxParticipants: '',
    deadlineDate: '',
    deadlineTime: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      let dDate = '';
      let dTime = '';
      if (order.deadline) {
          const date = new Date(order.deadline);
          dDate = format(date, 'yyyy-MM-dd');
          dTime = format(date, 'HH:mm');
      }

      setFormData({
        name: order.name,
        description: order.description,
        targetAmount: order.targetAmount?.toString() || '',
        maxParticipants: order.maxParticipants?.toString() || '',
        deadlineDate: dDate,
        deadlineTime: dTime,
      });
    }
  }, [isOpen, order]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);

    try {
        let deadline: string | undefined = undefined;
        if (formData.deadlineDate) {
            const dateStr = `${formData.deadlineDate}T${formData.deadlineTime || '23:59'}`;
            deadline = new Date(dateStr).toISOString();
        }

        const updates: any = {
            name: formData.name,
            description: formData.description,
            targetAmount: formData.targetAmount ? parseInt(formData.targetAmount) : null,
            maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        };
        
        // Only update deadline if it changed or was removed
        if (deadline) {
            updates.deadline = deadline;
        } else if (order.deadline && !formData.deadlineDate) {
             updates.deadline = null; // Remove deadline
        }

        const orderRef = doc(firestore, 'groupBuyOrders', order.id);
        await updateDocumentNonBlocking(orderRef, updates);

        toast({ title: "團購設定已更新" });
        onClose();
    } catch (error) {
        console.error(error);
        toast({ title: "更新失敗", description: "請稍後再試", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>編輯團購設定</DialogTitle>
          <DialogDescription>
            修改團購的基本資訊與限制條件。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">名稱</Label>
                <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="targetAmount">目標金額</Label>
                    <Input 
                        id="targetAmount" 
                        type="number"
                        value={formData.targetAmount} 
                        onChange={e => setFormData({...formData, targetAmount: e.target.value})} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="maxParticipants">人數上限</Label>
                    <Input 
                        id="maxParticipants" 
                        type="number"
                        value={formData.maxParticipants} 
                        onChange={e => setFormData({...formData, maxParticipants: e.target.value})} 
                    />
                </div>
            </div>
            <div className="grid gap-2">
                <Label>截止時間</Label>
                <div className="flex gap-2">
                    <Input 
                        type="date" 
                        value={formData.deadlineDate}
                        onChange={e => setFormData({...formData, deadlineDate: e.target.value})}
                    />
                    <Input 
                        type="time" 
                        value={formData.deadlineTime}
                        onChange={e => setFormData({...formData, deadlineTime: e.target.value})}
                    />
                </div>
            </div>
        </div>

        <DialogFooter>
             <Button variant="outline" onClick={onClose}>取消</Button>
             <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '儲存中...' : '儲存變更'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
