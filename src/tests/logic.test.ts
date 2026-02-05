import { describe, it, expect } from 'vitest';
import { parseNumericPrice, getRelevantHtml, generateOrderCSV } from '../lib/utils';
import type { Order } from '../lib/definitions';

describe('Logic & Utility Tests', () => {
  
  describe('parseNumericPrice', () => {
    it('should extract numbers from simple price strings', () => {
      expect(parseNumericPrice('$100')).toBe(100);
      expect(parseNumericPrice('TWD 500')).toBe(500);
      expect(parseNumericPrice('價格: 99元')).toBe(99);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(parseNumericPrice('Free')).toBe(0);
      expect(parseNumericPrice('')).toBe(0);
    });
  });

  describe('getRelevantHtml', () => {
    it('should extract head and body content correctly', () => {
      const html = `
        <html>
          <head><title>Test Page</title><meta property="og:price" content="100"></head>
          <body>
            <div id="main">Product Info</div>
          </body>
        </html>
      `;
      const result = getRelevantHtml(html);
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('Product Info');
    });
  });

  describe('generateOrderCSV', () => {
    it('should generate correct CSV format for a simple order', () => {
      const mockOrder = {
        name: 'Test Tea Order',
        participants: [
          {
            user: { name: 'Jill' },
            items: [
              {
                item: { name: 'Green Tea', price: 30 },
                quantity: 2,
                selectedAttributes: { 'sugar': 'none' }
              }
            ],
            paid: true
          }
        ]
      } as unknown as Order;

      const csv = generateOrderCSV(mockOrder);
      expect(csv).toContain('參與者,項目,數量,單價,選項,小計,付款狀態');
      expect(csv).toContain('Jill,Green Tea,2,30,"sugar: none",60,已付');
    });
  });
});
