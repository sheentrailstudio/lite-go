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
import { CalendarIcon, Clock, DollarSign, ImageUp, Plus, Trash2, X, Package, ChevronDown } from 'lucide-react';
import { cn, parseNumericPrice } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { GroupBuyOrderDocument } from '@/lib/definitions';
import Image from 'next/image';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import React, { useState } from 'react';
import { attributeTemplates, type AttributeTemplate } from '@/lib/attribute-templates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';


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

function AttributesFieldArray({ itemIndex, control, register }: { itemIndex: number, control: any, register: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.attributes`,
  });

  const handleApplyTemplate = (template: AttributeTemplate) => {
    append({
      name: template.name,
      options: template.options,
    });
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Label>屬性</Label>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="text-sm">
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
                    onClick={() => append({ name: '', options: [] })}
                >
                    <Plus className="mr-2 h-4 w-4" /> 新增自訂
                </Button>
            </div>
        </div>

      <div className="space-y-6">
        {fields.map((field, attrIndex) => (
          <React.Fragment key={field.id}>
             {attrIndex > 0 && <Separator />}
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-2">
                  <div className="grid gap-1.5 flex-1">
                    <Label htmlFor={`items.${itemIndex}.attributes.${attrIndex}.name`} className="text-xs font-normal">屬性名稱</Label>
                    <Input
                      id={`items.${itemIndex}.attributes.${attrIndex}.name`}
                      placeholder="例如：尺寸"
                      {...register(`items.${itemIndex}.attributes.${attrIndex}.name`)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(attrIndex)} className="mb-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <OptionsFieldArray itemIndex={itemIndex} attrIndex={attrIndex} control={control} />
              </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function OptionsFieldArray({ itemIndex, attrIndex, control }: { itemIndex: number, attrIndex: number, control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.attributes.${attrIndex}.options`,
  });
  
  const [optionValue, setOptionValue] = useState('');
  const [optionPrice, setOptionPrice] = useState('0');

  const onAddOption = () => {
    if (optionValue) {
      append({ value: optionValue, price: parseInt(optionPrice, 10) || 0 });
      setOptionValue('');
      setOptionPrice('0');
    }
  }
  
  return (
    <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">選項</Label>
        {fields.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {fields.map((field: any, optionIndex) => (
                    <div key={field.id} className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
                        <span>{field.value}{field.price > 0 ? ` (+$${field.price})` : ''}</span>
                        <button type="button" onClick={() => remove(optionIndex)} className="-mr-1">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}
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


import { imageToItemConversion } from '@/ai/flows/image-to-item-conversion';
import { webLinkItemExtraction } from '@/ai/flows/web-link-item-extraction';
import { Loader2, ScanLine, Link as LinkIcon } from 'lucide-react';

export default function CreateOrderForm() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);

  const { register, control, handleSubmit, setValue, getValues, watch } = useForm<FormValues>({
    defaultValues: {
      orderName: '',
      description: '',
      items: [{ name: '', price: 0, images: [], attributes: [], maxQuantity: undefined }],
      visibility: 'public',
      enableStatusTracking: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  
  const handleUrlImport = async () => {
      const url = prompt("請輸入商品網址：");
      if (!url) return;
      
      setIsAnalyzingUrl(true);
      try {
          const result = await webLinkItemExtraction({ url });
          if (result) {
               // Remove empty initial item if exists
               const currentItems = getValues('items');
               if (currentItems.length === 1 && !currentItems[0].name && !currentItems[0].price) {
                    remove(0);
               }
               
               append({
                  name: result.name,
                  price: parseInt(result.price.replace(/[^0-9]/g, ''), 10) || 0,
                  images: result.imageUrl ? [result.imageUrl] : [],
                  attributes: [],
                  maxQuantity: undefined
               });
               toast({ title: "網址解析成功", description: `已新增商品：${result.name}` });
          }
      } catch (error) {
          console.error("URL Analysis failed:", error);
          toast({ title: "解析失敗", description: "無法從網址讀取商品資訊。請確認網址是否公開。", variant: "destructive" });
      } finally {
          setIsAnalyzingUrl(false);
      }
  };

  const handleMenuUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzingMenu(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
            const result = await imageToItemConversion({ photoDataUri: base64Data });
            
            if (result.items && result.items.length > 0) {
                const newItems = result.items.map(item => ({
                    name: item.name,
                    price: parseNumericPrice(item.price),
                    images: [], // Optionally, we could attach the menu crop here if the API supported it
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
                    title: "菜單解析成功", 
                    description: `已新增 ${result.items.length} 個項目。` 
                });
            } else {
                toast({ title: "未偵測到項目", description: "無法從圖片中辨識出菜單項目。", variant: "warning" });
            }
        } catch (error) {
            console.error("AI Analysis failed:", error);
            toast({ title: "解析失敗", description: "請確認圖片清晰度或稍後再試。", variant: "destructive" });
        } finally {
            setIsAnalyzingMenu(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
       console.error("File reading failed:", error);
       setIsAnalyzingMenu(false);
    }
    event.target.value = ''; // Reset input
  };

  const handleImageFilesChange = (event: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const files = event.target.files;
    if (!files) return;

    const currentImages = getValues(`items.${itemIndex}.images`) || [];
    if (currentImages.length + files.length > 5) {
      toast({ title: '每個項目最多只能上傳 5 張圖片。', variant: 'destructive' });
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedImages = [...getValues(`items.${itemIndex}.images`), reader.result as string];
        setValue(`items.${itemIndex}.images`, updatedImages, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    });
    event.target.value = ''; // Reset file input
  };
  
  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) {
      toast({ title: "請先登入", variant: "destructive" });
      return;
    }

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
      name: data.orderName,
      description: data.description,
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
      ...(data.targetAmount != null && !isNaN(data.targetAmount) && { targetAmount: data.targetAmount }),
    };

    try {
      const orderRef = await addDocumentNonBlocking(collection(firestore, 'groupBuyOrders'), newOrderData);

      if (!orderRef) {
          throw new Error("Failed to create order document.");
      }

      // Add items as subcollection
      for (const item of data.items) {
          const itemRef = doc(collection(firestore, 'groupBuyOrders', orderRef.id, 'items'));
          const itemData = {
              name: item.name,
              price: item.price,
              ...(item.maxQuantity != null && !isNaN(item.maxQuantity) && { maxQuantity: item.maxQuantity }),
              images: item.images.map((imgDataUri, imgIndex) => ({
                  id: `img-${imgIndex}`,
                  src: imgDataUri, // In a real app, upload to storage and save URL
                  alt: item.name,
              })),
              attributes: item.attributes.map((attr, attrIndex) => ({
                  id: `attr-${attrIndex}`,
                  name: attr.name,
                  options: attr.options.map((opt, optIndex) => ({
                      id: `opt-${attrIndex}-${optIndex}`,
                      value: opt.value,
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
          title: "訂單已建立！",
          description: "您的新團購已成功建立。"
      });
      router.push('/dashboard');

    } catch (error) {
        console.error("Error creating order: ", error);
        toast({ title: "建立訂單失敗", description: "請稍後再試。", variant: "destructive" });
    }
  };

  if (isUserLoading) {
    return <div>讀取中...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>訂單詳情與條件</CardTitle>
          <CardDescription>
            為您的團購命名、加上描述，並設定相關條件。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="orderName">訂單名稱</Label>
                <Input id="orderName" placeholder="例如：每週團隊午餐" {...register('orderName', { required: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Textarea id="description" placeholder="訂單的簡短描述。" {...register('description')} />
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
                    <Input id="targetAmount" type="number" placeholder="1000" className="pl-8" step="1" {...register('targetAmount', { valueAsNumber: true })} />
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
                  <p className="text-xs text-muted-foreground">公開訂單會顯示在公共列表上，任何人皆可瀏覽。 </p>
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

      <Card>
        <CardHeader>
          <CardTitle>項目</CardTitle>
          <CardDescription>新增此團購可用的項目。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((itemField, index) => {
            const watchedImages = watch(`items.${index}.images`);
            return (
              <Card key={itemField.id} className="overflow-hidden bg-card border shadow-sm">
                 <CardHeader className="flex flex-row items-center justify-between bg-muted/30 p-3">
                    <CardTitle className="text-base font-semibold">項目 #{index + 1}</CardTitle>
                    {fields.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => remove(index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-4 grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`items.${index}.name`}>項目名稱</Label>
                      <Input id={`items.${index}.name`} placeholder="例如：黑色T恤" {...register(`items.${index}.name`, { required: true })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`items.${index}.price`}>價格</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input id={`items.${index}.price`} type="number" placeholder="300" className="pl-8" {...register(`items.${index}.price`, { required: true, valueAsNumber: true, min: 0 })} step="1" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`items.${index}.maxQuantity`}>總數量 (選填)</Label>
                        <div className="relative">
                          <Package className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input id={`items.${index}.maxQuantity`} type="number" placeholder="100" className="pl-8" {...register(`items.${index}.maxQuantity`, { valueAsNumber: true })} step="1" />
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
                            <input id={`items.${index}.image-upload`} type="file" accept="image/*" multiple 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleImageFilesChange(e, index)} disabled={(watchedImages?.length || 0) >= 5} />
                            <label htmlFor={`items.${index}.image-upload`} className={cn("flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer", (watchedImages?.length || 0) >= 5 ? "cursor-not-allowed bg-muted/50" : "hover:bg-muted/50")}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <ImageUp className="w-8 h-8 mb-4 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">點擊上傳</span>或拖曳</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF (最多5張)</p>
                                </div>
                            </label>
                        </div>
                        
                        {watchedImages && watchedImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {watchedImages.map((imageSrc, imgIndex) => (
                                    <div key={imgIndex} className="relative w-24 h-24">
                                        <Image src={imageSrc} alt={`項目圖片 ${imgIndex + 1}`} layout="fill" className="rounded-md object-cover" />
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="icon" 
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={() => {
                                                const updatedImages = watchedImages.filter((_, i) => i !== imgIndex);
                                                setValue(`items.${index}.images`, updatedImages);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          <div className="flex gap-2">
            <Button
                type="button"
                variant="secondary"
                onClick={() => append({ name: '', price: 0, images: [], attributes: [], maxQuantity: undefined })}
            >
                <Plus className="mr-2 h-4 w-4" /> 新增項目
            </Button>
            <div className="relative">
                <input
                    id="menu-upload"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleMenuUpload}
                    disabled={isAnalyzingMenu}
                />
                <Button type="button" variant="outline" disabled={isAnalyzingMenu}>
                    {isAnalyzingMenu ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            解析中...
                        </>
                    ) : (
                        <>
                            <ScanLine className="mr-2 h-4 w-4" />
                            由菜單圖片匯入 (AI)
                        </>
                    )}
                </Button>
            </div>
            <Button type="button" variant="outline" onClick={handleUrlImport} disabled={isAnalyzingUrl}>
                 {isAnalyzingUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                 由網址匯入 (AI)
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button size="lg" type="submit" disabled={fields.length === 0 || isUserLoading}>建立訂單</Button>
      </div>
    </form>
  );
}
