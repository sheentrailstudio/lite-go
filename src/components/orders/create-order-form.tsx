'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CalendarIcon, 
  Clock, 
  DollarSign, 
  ImageUp, 
  Plus, 
  Trash2, 
  X, 
  Package, 
  ChevronDown,
  Loader2, 
  ScanLine, 
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { cn, parseNumericPrice } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import Image from 'next/image';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Skeleton } from '../ui/skeleton';
import React, { useState, useCallback, useMemo } from 'react';
import { attributeTemplates, type AttributeTemplate } from '@/lib/attribute-templates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer, cartItemPop } from '@/lib/motion';
import { imageToItemConversion } from '@/ai/flows/image-to-item-conversion';
import { webLinkItemExtraction } from '@/ai/flows/web-link-item-extraction';


type FormValues = {
  orderName: string;
  description: string;
  deadlineDate?: Date;
  deadlineTime?: string;
  targetAmount?: number;
  items: {
    name: string;
    price: number;
    maxQuantity?: number;
    images: string[]; // data URIs
    attributes: {
      name: string;
      options: { value: string, price: number }[];
    }[];
  }[];
  visibility: 'public' | 'private';
  enableStatusTracking: boolean;
};

// ===== Validation Error Display =====
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p 
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-destructive mt-1 flex items-center gap-1"
    >
      <AlertCircle className="h-3 w-3" />
      {message}
    </motion.p>
  );
}

// ===== Attributes Field Array Component =====
function AttributesFieldArray({ itemIndex, control, register }: { itemIndex: number, control: any, register: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.attributes`,
  });

  const handleApplyTemplate = useCallback((template: AttributeTemplate) => {
    append({
      name: template.name,
      options: template.options,
    });
  }, [append]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          屬性
          <span className="text-xs text-muted-foreground font-normal">(選填)</span>
        </Label>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-sm h-8">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                套用模板
                <ChevronDown className="ml-1.5 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {attributeTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onSelect={() => handleApplyTemplate(template)}
                >
                  {template.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => append({ name: '', options: [] })}
          >
            <Plus className="mr-2 h-4 w-4" /> 新增自訂
          </Button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-6">
          {fields.map((field, attrIndex) => (
            <motion.div
              key={field.id}
              variants={cartItemPop}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              {attrIndex > 0 && <Separator className="mb-6" />}
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-2">
                  <div className="grid gap-1.5 flex-1">
                    <Label htmlFor={`items.${itemIndex}.attributes.${attrIndex}.name`} className="text-xs font-normal">
                      屬性名稱
                    </Label>
                    <Input
                      id={`items.${itemIndex}.attributes.${attrIndex}.name`}
                      placeholder="例如：尺寸"
                      {...register(`items.${itemIndex}.attributes.${attrIndex}.name`)}
                    />
                  </div>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    onClick={() => remove(attrIndex)} 
                    className="mb-1 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <OptionsFieldArray itemIndex={itemIndex} attrIndex={attrIndex} control={control} />
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

// ===== Options Field Array Component =====
function OptionsFieldArray({ itemIndex, attrIndex, control }: { itemIndex: number, attrIndex: number, control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.attributes.${attrIndex}.options`,
  });
  
  const [optionValue, setOptionValue] = useState('');
  const [optionPrice, setOptionPrice] = useState('0');

  const onAddOption = useCallback(() => {
    if (optionValue.trim()) {
      append({ value: optionValue.trim(), price: parseInt(optionPrice, 10) || 0 });
      setOptionValue('');
      setOptionPrice('0');
    }
  }, [optionValue, optionPrice, append]);
  
  return (
    <div className="space-y-2">
      <Label className="text-xs font-normal text-muted-foreground">選項</Label>
      <AnimatePresence mode="popLayout">
        {fields.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-2"
          >
            {fields.map((field: any, optionIndex) => (
              <motion.div 
                key={field.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium"
              >
                <span>{field.value}{field.price > 0 ? ` (+$${field.price})` : ''}</span>
                <button 
                  type="button" 
                  onClick={() => remove(optionIndex)} 
                  className="-mr-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2">
        <Input 
          value={optionValue}
          onChange={e => setOptionValue(e.target.value)}
          placeholder="選項名稱 (例如：大杯)" 
          className="h-9"
        />
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+</span>
          <Input 
            value={optionPrice}
            onChange={e => setOptionPrice(e.target.value)}
            type="number" 
            step="1" 
            placeholder="價格" 
            className="h-9 pl-6 w-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddOption();
              }
            }}
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onAddOption}>新增</Button>
      </div>
    </div>
  );
}

// ===== Loading State Component =====
function CreateFormSkeleton() {
  return (
    <div className="grid gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Main Form Component =====
export default function CreateOrderForm() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { register, control, handleSubmit, setValue, getValues, watch, formState: { errors, isValid, isDirty } } = useForm<FormValues>({
    defaultValues: {
      orderName: '',
      description: '',
      items: [{ name: '', price: 0, images: [], attributes: [], maxQuantity: undefined }],
      visibility: 'public',
      enableStatusTracking: true,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // AI URL Import with enhanced error handling
  const handleUrlImport = useCallback(async () => {
    const url = prompt("請輸入商品網址：");
    if (!url) return;
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast({ title: "網址格式錯誤", description: "請輸入有效的網址", variant: "destructive" });
      return;
    }
    
    setIsAnalyzingUrl(true);
    setAiError(null);
    
    try {
      const result = await webLinkItemExtraction({ url });
      
      if (!result || !result.name) {
        throw new Error('無法從網頁擷取商品資訊');
      }
      
      // Remove empty initial item if exists
      const currentItems = getValues('items');
      if (currentItems.length === 1 && !currentItems[0].name && !currentItems[0].price) {
        remove(0);
      }
       
      append({
        name: result.name,
        price: parseInt(result.price?.replace(/[^0-9]/g, ''), 10) || 0,
        images: result.imageUrl ? [result.imageUrl] : [],
        attributes: [],
        maxQuantity: undefined
      });
      
      toast({ 
        title: "✨ 網址解析成功", 
        description: `已新增商品：${result.name}` 
      });
    } catch (error) {
      console.error("URL Analysis failed:", error);
      const message = error instanceof Error ? error.message : '無法從網址讀取商品資訊';
      setAiError(message);
      toast({ 
        title: "解析失敗", 
        description: message + "。請確認網址是否公開。", 
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzingUrl(false);
    }
  }, [getValues, remove, append]);

  // AI Menu Upload with enhanced error handling
  const handleMenuUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "檔案類型錯誤", description: "請上傳圖片檔案", variant: "destructive" });
      event.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "檔案過大", description: "圖片檔案不得超過 10MB", variant: "destructive" });
      event.target.value = '';
      return;
    }

    setIsAnalyzingMenu(true);
    setAiError(null);
    
    try {
      const reader = new FileReader();
      
      reader.onerror = () => {
        throw new Error('讀取檔案失敗');
      };
      
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        try {
          const result = await imageToItemConversion({ photoDataUri: base64Data });
          
          if (!result.items || result.items.length === 0) {
            toast({ 
              title: "未偵測到項目", 
              description: "無法從圖片中辨識出菜單項目。請確保圖片清晰且包含價格。", 
              variant: "warning" 
            });
            return;
          }
          
          const newItems = result.items.map(item => ({
            name: item.name,
            price: parseNumericPrice(item.price),
            images: [],
            attributes: [],
            maxQuantity: undefined
          }));
          
          // If the form currently has only one empty item, replace it
          const currentItems = getValues('items');
          if (currentItems.length === 1 && !currentItems[0].name && !currentItems[0].price) {
            remove(0);
          }

          append(newItems);
          toast({ 
            title: "🎉 菜單解析成功", 
            description: `已新增 ${result.items.length} 個項目。` 
          });
        } catch (error) {
          console.error("AI Analysis failed:", error);
          const message = error instanceof Error ? error.message : '解析菜單時發生錯誤';
          setAiError(message);
          toast({ 
            title: "解析失敗", 
            description: "請確認圖片清晰度或稍後再試。", 
            variant: "destructive" 
          });
        } finally {
          setIsAnalyzingMenu(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File reading failed:", error);
      setIsAnalyzingMenu(false);
      toast({ title: "讀取檔案失敗", variant: "destructive" });
    }
    
    event.target.value = ''; // Reset input
  }, [getValues, remove, append]);

  // Image upload handler with validation
  const handleImageFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const files = event.target.files;
    if (!files) return;

    const currentImages = getValues(`items.${itemIndex}.images`) || [];
    if (currentImages.length + files.length > 5) {
      toast({ title: '每個項目最多只能上傳 5 張圖片。', variant: 'destructive' });
      event.target.value = '';
      return;
    }

    Array.from(files).forEach(file => {
      // Validate each file
      if (!file.type.startsWith('image/')) {
        toast({ title: `${file.name} 不是圖片檔案`, variant: 'destructive' });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} 超過 5MB 限制`, variant: 'destructive' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedImages = [...getValues(`items.${itemIndex}.images`), reader.result as string];
        setValue(`items.${itemIndex}.images`, updatedImages, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    });
    
    event.target.value = ''; // Reset file input
  }, [getValues, setValue]);
  
  // Form submission with comprehensive error handling
  const onSubmit = useCallback(async (data: FormValues) => {
    if (!firestore || !user) {
      toast({ title: "請先登入", variant: "destructive" });
      return;
    }

    // Validate items
    const validItems = data.items.filter(item => item.name.trim() && item.price >= 0);
    if (validItems.length === 0) {
      toast({ title: "請至少新增一個有效項目", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let deadline: string | undefined = undefined;
      if (data.deadlineDate) {
        const date = new Date(data.deadlineDate);
        if (data.deadlineTime) {
          const [hours, minutes] = data.deadlineTime.split(':');
          date.setHours(parseInt(hours, 10));
          date.setMinutes(parseInt(minutes, 10));
        }
        deadline = date.toISOString();
      }
      
      const newOrderData = {
        name: data.orderName.trim(),
        description: data.description.trim(),
        status: 'open' as const,
        visibility: data.visibility,
        initiatorId: user.uid,
        initiatorName: user.displayName || '新用戶',
        createdAt: new Date().toISOString(),
        image: {
          src: `https://picsum.photos/seed/${Date.now()}/400/400`,
          alt: '新訂單',
          hint: 'new order',
        },
        enableStatusTracking: data.enableStatusTracking,
        participantIds: [],
        ...(deadline && { deadline }),
        ...(data.targetAmount != null && !isNaN(data.targetAmount) && data.targetAmount > 0 && { targetAmount: data.targetAmount }),
      };

      const orderRef = await addDocumentNonBlocking(collection(firestore, 'groupBuyOrders'), newOrderData);

      if (!orderRef) {
        throw new Error("Failed to create order document.");
      }

      // Add items as subcollection
      for (const item of validItems) {
        const itemRef = doc(collection(firestore, 'groupBuyOrders', orderRef.id, 'items'));
        const itemData = {
          name: item.name.trim(),
          price: item.price,
          ...(item.maxQuantity != null && !isNaN(item.maxQuantity) && item.maxQuantity > 0 && { maxQuantity: item.maxQuantity }),
          images: item.images.map((imgDataUri, imgIndex) => ({
            id: `img-${imgIndex}`,
            src: imgDataUri,
            alt: item.name,
          })),
          attributes: item.attributes
            .filter(attr => attr.name.trim())
            .map((attr, attrIndex) => ({
              id: `attr-${attrIndex}`,
              name: attr.name.trim(),
              options: attr.options
                .filter(opt => opt.value.trim())
                .map((opt, optIndex) => ({
                  id: `opt-${attrIndex}-${optIndex}`,
                  value: opt.value.trim(),
                  price: opt.price || 0,
                })),
            })),
        };
        setDocumentNonBlocking(itemRef, itemData, {});
      }
      
      if (data.enableStatusTracking) {
        const statusRef = doc(collection(firestore, 'groupBuyOrders', orderRef.id, 'statusUpdates'));
        setDocumentNonBlocking(statusRef, {
          message: '訂單已建立',
          createdAt: new Date().toISOString(),
        }, {});
      }
      
      toast({
        title: "🎉 訂單已建立！",
        description: "您的新團購已成功建立。"
      });
      
      router.push(`/dashboard/orders/${orderRef.id}`);

    } catch (error) {
      console.error("Error creating order: ", error);
      toast({ 
        title: "建立訂單失敗", 
        description: error instanceof Error ? error.message : "請稍後再試。", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [firestore, user, router]);

  // Computed states
  const canSubmit = useMemo(() => {
    const items = watch('items');
    const orderName = watch('orderName');
    return orderName?.trim() && items.some(item => item.name?.trim() && item.price >= 0);
  }, [watch]);

  // Loading state
  if (isUserLoading) {
    return <CreateFormSkeleton />;
  }

  // Auth check
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <motion.form 
      onSubmit={handleSubmit(onSubmit)} 
      className="grid gap-4 md:gap-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* AI Error Alert */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{aiError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Details Card */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              訂單詳情與條件
            </CardTitle>
            <CardDescription>
              為您的團購命名、加上描述，並設定相關條件。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="orderName">
                    訂單名稱 <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="orderName" 
                    placeholder="例如：每週團隊午餐" 
                    {...register('orderName', { 
                      required: '請輸入訂單名稱',
                      minLength: { value: 2, message: '名稱至少需要 2 個字元' }
                    })} 
                    className={cn(errors.orderName && "border-destructive")}
                  />
                  <FieldError message={errors.orderName?.message} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea 
                    id="description" 
                    placeholder="訂單的簡短描述。" 
                    {...register('description')} 
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>截止日期</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="deadlineDate"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'flex-1 justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'PPP') : <span>選擇日期</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="time" className="pl-8" {...register('deadlineTime')} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="targetAmount">目標金額 (選填)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="targetAmount" 
                      type="number" 
                      placeholder="1000" 
                      className="pl-8" 
                      step="1" 
                      min="0"
                      {...register('targetAmount', { valueAsNumber: true })} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="visibility-switch" className="font-normal">公開訂單</Label>
                  <Controller
                    name="visibility"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="visibility-switch"
                        checked={field.value === 'public'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'public' : 'private')}
                      />
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">公開訂單會顯示在公共列表上，任何人皆可瀏覽。</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="status-tracking-switch" className="font-normal">啟用狀態追蹤</Label>
                  <Controller
                    name="enableStatusTracking"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="status-tracking-switch"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">允許您在訂單建立後向參與者更新進度。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Items Card */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              項目
            </CardTitle>
            <CardDescription>新增此團購可用的項目。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="popLayout">
              {fields.map((itemField, index) => {
                const watchedImages = watch(`items.${index}.images`);
                return (
                  <motion.div
                    key={itemField.id}
                    variants={cartItemPop}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <Card className="overflow-hidden bg-card border shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between bg-muted/30 p-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          項目 #{index + 1}
                        </CardTitle>
                        {fields.length > 1 && (
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                              onClick={() => remove(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor={`items.${index}.name`}>
                              項目名稱 <span className="text-destructive">*</span>
                            </Label>
                            <Input 
                              id={`items.${index}.name`} 
                              placeholder="例如：黑色T恤" 
                              {...register(`items.${index}.name`, { required: true })} 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor={`items.${index}.price`}>
                                價格 <span className="text-destructive">*</span>
                              </Label>
                              <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  id={`items.${index}.price`} 
                                  type="number" 
                                  placeholder="300" 
                                  className="pl-8" 
                                  {...register(`items.${index}.price`, { required: true, valueAsNumber: true, min: 0 })} 
                                  step="1" 
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`items.${index}.maxQuantity`}>總數量 (選填)</Label>
                              <div className="relative">
                                <Package className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  id={`items.${index}.maxQuantity`} 
                                  type="number" 
                                  placeholder="100" 
                                  className="pl-8" 
                                  {...register(`items.${index}.maxQuantity`, { valueAsNumber: true })} 
                                  step="1" 
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <AttributesFieldArray itemIndex={index} control={control} register={register} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label>圖片 (最多5張)</Label>
                            <div className="relative">
                              <input 
                                id={`items.${index}.image-upload`} 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleImageFilesChange(e, index)} 
                                disabled={(watchedImages?.length || 0) >= 5} 
                              />
                              <label 
                                htmlFor={`items.${index}.image-upload`} 
                                className={cn(
                                  "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                  (watchedImages?.length || 0) >= 5 
                                    ? "cursor-not-allowed bg-muted/50" 
                                    : "hover:bg-muted/50 hover:border-primary/30"
                                )}
                              >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <ImageUp className="w-8 h-8 mb-4 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold">點擊上傳</span>或拖曳
                                  </p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF (最多5張)</p>
                                </div>
                              </label>
                            </div>
                            
                            <AnimatePresence>
                              {watchedImages && watchedImages.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="flex flex-wrap gap-2 mt-2"
                                >
                                  {watchedImages.map((imageSrc, imgIndex) => (
                                    <motion.div 
                                      key={imgIndex}
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.8, opacity: 0 }}
                                      className="relative w-24 h-24 group"
                                    >
                                      <Image 
                                        src={imageSrc} 
                                        alt={`項目圖片 ${imgIndex + 1}`} 
                                        fill 
                                        className="rounded-md object-cover" 
                                      />
                                      <motion.div whileHover={{ scale: 1.1 }}>
                                        <Button 
                                          type="button" 
                                          variant="destructive" 
                                          size="icon" 
                                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => {
                                            const updatedImages = watchedImages.filter((_, i) => i !== imgIndex);
                                            setValue(`items.${index}.images`, updatedImages);
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                    </motion.div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => append({ name: '', price: 0, images: [], attributes: [], maxQuantity: undefined })}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> 新增項目
                </Button>
              </motion.div>
              
              <div className="relative">
                <input
                  id="menu-upload"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleMenuUpload}
                  disabled={isAnalyzingMenu}
                />
                <motion.div whileHover={{ scale: isAnalyzingMenu ? 1 : 1.02 }} whileTap={{ scale: isAnalyzingMenu ? 1 : 0.98 }}>
                  <Button type="button" variant="outline" disabled={isAnalyzingMenu} className="gap-2">
                    {isAnalyzingMenu ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-4 w-4" />
                        由菜單圖片匯入 (AI)
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
              
              <motion.div whileHover={{ scale: isAnalyzingUrl ? 1 : 1.02 }} whileTap={{ scale: isAnalyzingUrl ? 1 : 0.98 }}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleUrlImport} 
                  disabled={isAnalyzingUrl}
                  className="gap-2"
                >
                  {isAnalyzingUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  由網址匯入 (AI)
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Submit Button */}
      <motion.div variants={fadeUp} className="flex justify-end">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            size="lg" 
            type="submit" 
            disabled={!canSubmit || isSubmitting}
            className="gap-2 shadow-lg min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                建立中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                建立訂單
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
