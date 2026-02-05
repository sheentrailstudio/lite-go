import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Order } from "./definitions"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts digits from a price string.
 */
export function parseNumericPrice(priceStr: string): number {
    return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * Extracts relevant HTML content for AI analysis.
 */
export function getRelevantHtml(html: string): string {
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    return `
        ${headMatch ? headMatch[1] : ''}
        ${bodyMatch ? bodyMatch[1].slice(0, 20000) : html.slice(0, 25000)}
    `.trim();
}

/**
 * Generates CSV content from an Order object.
 */
export function generateOrderCSV(order: Order): string {
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

    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
}
