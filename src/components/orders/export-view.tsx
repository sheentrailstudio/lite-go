'use client';

import { useState } from 'react';
import type { Order } from '@/lib/definitions';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Download, FileSpreadsheet, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ExportView({ order }: { order: Order }) {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCSV = () => {
    // Header
    const headers = ['參與者', '項目', '數量', '單價', '選項', '小計', '付款狀態'];
    const rows = [];

    order.participants.forEach(p => {
      p.items.forEach(ci => {
        const attrText = ci.selectedAttributes 
          ? Object.entries(ci.selectedAttributes).map(([k, v]) => `${k}: ${v}`).join('; ')
          : '';
        
        let price = ci.item.price;
        if (ci.selectedAttributes) {
            Object.entries(ci.selectedAttributes).forEach(([attrId, val]) => {
                const attr = ci.item.attributes?.find(a => a.id === attrId);
                const opt = attr?.options.find(o => o.value === val);
                if (opt) price += opt.price;
            });
        }

        rows.push([
          p.user.name,
          ci.item.name,
          ci.quantity,
          ci.item.price,
          `"${attrText}"`,
          price * ci.quantity,
          p.paid ? '已付' : '未付'
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    return csvContent;
  };

  const handleDownloadCSV = () => {
    setIsExporting(true);
    try {
      const csvData = generateCSV();
      const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `LiteGo_Order_${order.name}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "匯出成功", description: "CSV 檔案已下載。" });
    } catch (e) {
      toast({ title: "匯出失敗", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
      const csvData = generateCSV();
      navigator.clipboard.writeText(csvData);
      setCopied(true);
      toast({ title: "已複製到剪貼簿" });
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-none shadow-sm bg-muted/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> 數據匯出
        </CardTitle>
        <CardDescription className="text-xs">匯出訂單明細至 Excel 或試算表。</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleDownloadCSV} disabled={isExporting}>
          <Download className="mr-2 h-3.5 w-3.5" /> 下載 CSV
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleCopySummary}>
          {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
          複製數據
        </Button>
      </CardContent>
    </Card>
  );
}
