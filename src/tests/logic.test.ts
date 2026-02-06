import { describe, it, expect, vi } from 'vitest';
import { parseNumericPrice, getRelevantHtml, generateOrderCSV } from '../lib/utils';
import type { Order, Participant, Item, CartItem, User, Attribute, AttributeOption } from '../lib/definitions';

// ============================================================
// HELPER FACTORIES FOR TEST DATA
// ============================================================

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createAttributeOption = (overrides: Partial<AttributeOption> = {}): AttributeOption => ({
  id: 'opt-1',
  value: 'Small',
  price: 0,
  ...overrides,
});

const createAttribute = (overrides: Partial<Attribute> = {}): Attribute => ({
  id: 'attr-1',
  name: 'Size',
  options: [createAttributeOption()],
  ...overrides,
});

const createItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  name: 'Test Item',
  price: 100,
  ...overrides,
});

const createCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  item: createItem(),
  quantity: 1,
  ...overrides,
});

const createParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  user: createUser(),
  items: [createCartItem()],
  totalCost: 100,
  paid: false,
  ...overrides,
});

const createOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  name: 'Test Order',
  description: 'A test order',
  status: 'open',
  visibility: 'public',
  initiatorId: 'user-1',
  initiatorName: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  initiator: createUser(),
  participants: [createParticipant()],
  availableItems: [createItem()],
  ...overrides,
});

// ============================================================
// PARSE NUMERIC PRICE TESTS
// ============================================================

describe('parseNumericPrice', () => {
  describe('Basic Currency Formats', () => {
    it('should extract numbers from simple price strings', () => {
      expect(parseNumericPrice('$100')).toBe(100);
      expect(parseNumericPrice('TWD 500')).toBe(500);
      expect(parseNumericPrice('價格: 99元')).toBe(99);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(parseNumericPrice('Free')).toBe(0);
      expect(parseNumericPrice('')).toBe(0);
    });

    it('should handle prices with decimal points', () => {
      // Current implementation strips decimals - extracts digits only
      expect(parseNumericPrice('$99.99')).toBe(9999);
      expect(parseNumericPrice('€149.50')).toBe(14950);
    });
  });

  describe('International Currency Symbols', () => {
    it('should handle Japanese Yen (¥)', () => {
      expect(parseNumericPrice('¥1500')).toBe(1500);
      expect(parseNumericPrice('¥ 2,500')).toBe(2500);
      expect(parseNumericPrice('¥10000')).toBe(10000);
    });

    it('should handle Korean Won (₩)', () => {
      expect(parseNumericPrice('₩5000')).toBe(5000);
      expect(parseNumericPrice('₩ 15,000')).toBe(15000);
      expect(parseNumericPrice('₩100000')).toBe(100000);
    });

    it('should handle Euro (€)', () => {
      expect(parseNumericPrice('€50')).toBe(50);
      expect(parseNumericPrice('€ 1,250')).toBe(1250);
      expect(parseNumericPrice('1.250 €')).toBe(1250);
    });

    it('should handle British Pound (£)', () => {
      expect(parseNumericPrice('£75')).toBe(75);
      expect(parseNumericPrice('£1,500')).toBe(1500);
    });

    it('should handle Indian Rupee (₹)', () => {
      expect(parseNumericPrice('₹999')).toBe(999);
      expect(parseNumericPrice('₹ 10,000')).toBe(10000);
    });

    it('should handle Thai Baht (฿)', () => {
      expect(parseNumericPrice('฿350')).toBe(350);
      expect(parseNumericPrice('350 ฿')).toBe(350);
    });

    it('should handle Chinese Yuan (元/¥)', () => {
      expect(parseNumericPrice('50元')).toBe(50);
      expect(parseNumericPrice('¥ 888')).toBe(888);
      expect(parseNumericPrice('人民幣 1000')).toBe(1000);
    });

    it('should handle New Taiwan Dollar (NT$)', () => {
      expect(parseNumericPrice('NT$350')).toBe(350);
      expect(parseNumericPrice('NT$ 1,500')).toBe(1500);
      expect(parseNumericPrice('新台幣 500')).toBe(500);
    });
  });

  describe('Thousand Separators (International Formats)', () => {
    it('should handle comma as thousand separator (US/UK format)', () => {
      expect(parseNumericPrice('$1,000')).toBe(1000);
      expect(parseNumericPrice('$1,000,000')).toBe(1000000);
      expect(parseNumericPrice('£12,345,678')).toBe(12345678);
    });

    it('should handle period as thousand separator (European format)', () => {
      expect(parseNumericPrice('€1.000')).toBe(1000);
      expect(parseNumericPrice('€1.000.000')).toBe(1000000);
    });

    it('should handle space as thousand separator (French/Russian format)', () => {
      expect(parseNumericPrice('1 000 €')).toBe(1000);
      expect(parseNumericPrice('1 000 000 ₽')).toBe(1000000);
    });

    it('should handle Indian numbering system (lakh/crore)', () => {
      expect(parseNumericPrice('₹1,00,000')).toBe(100000); // 1 lakh
      expect(parseNumericPrice('₹1,00,00,000')).toBe(10000000); // 1 crore
    });

    it('should handle apostrophe as thousand separator (Swiss format)', () => {
      expect(parseNumericPrice("CHF 1'000")).toBe(1000);
      expect(parseNumericPrice("1'234'567 CHF")).toBe(1234567);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null-like inputs gracefully', () => {
      expect(parseNumericPrice('')).toBe(0);
      expect(parseNumericPrice('   ')).toBe(0);
    });

    it('should handle strings with only currency symbols', () => {
      expect(parseNumericPrice('$')).toBe(0);
      expect(parseNumericPrice('¥ ')).toBe(0);
      expect(parseNumericPrice('€€€')).toBe(0);
    });

    it('should handle mixed text and numbers', () => {
      expect(parseNumericPrice('Price: $50 (discounted)')).toBe(50);
      expect(parseNumericPrice('約 NT$350 左右')).toBe(350);
      expect(parseNumericPrice('Originally $100, now $75')).toBe(10075); // Extracts all digits
    });

    it('should handle negative price indicators', () => {
      // Implementation extracts digits only, ignores minus sign
      expect(parseNumericPrice('-$50')).toBe(50);
      expect(parseNumericPrice('($100)')).toBe(100);
    });

    it('should handle very large numbers', () => {
      expect(parseNumericPrice('$999999999999')).toBe(999999999999);
      expect(parseNumericPrice('¥9,999,999,999,999')).toBe(9999999999999);
    });

    it('should handle numbers with leading zeros', () => {
      expect(parseNumericPrice('$0099')).toBe(99);
      expect(parseNumericPrice('$007')).toBe(7);
    });

    it('should handle Unicode number variants', () => {
      // Fullwidth digits (commonly used in East Asian contexts)
      expect(parseNumericPrice('１００円')).toBe(0); // Current implementation doesn't handle fullwidth
      // Regular digits mixed with fullwidth
      expect(parseNumericPrice('100円')).toBe(100);
    });
  });
});

// ============================================================
// GET RELEVANT HTML TESTS
// ============================================================

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

  it('should handle HTML without body tags', () => {
    const html = '<div>Just content</div>';
    const result = getRelevantHtml(html);
    expect(result).toContain('Just content');
  });

  it('should handle HTML without head tags', () => {
    const html = '<body><p>Body only</p></body>';
    const result = getRelevantHtml(html);
    expect(result).toContain('Body only');
  });

  it('should handle empty HTML', () => {
    const result = getRelevantHtml('');
    expect(result).toBe('');
  });

  it('should truncate very long body content', () => {
    const longContent = 'x'.repeat(30000);
    const html = `<body>${longContent}</body>`;
    const result = getRelevantHtml(html);
    expect(result.length).toBeLessThanOrEqual(20100); // 20000 + some buffer
  });
});

// ============================================================
// GENERATE ORDER CSV TESTS
// ============================================================

describe('generateOrderCSV', () => {
  describe('Basic CSV Generation', () => {
    it('should generate correct CSV format for a simple order', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Jill' }),
            items: [
              createCartItem({
                item: createItem({ name: 'Green Tea', price: 30 }),
                quantity: 2,
                selectedAttributes: { 'sugar': 'none' },
              }),
            ],
            paid: true,
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('參與者,項目,數量,單價,選項,小計,付款狀態');
      expect(csv).toContain('Jill,Green Tea,2,30,"sugar: none",60,已付');
    });

    it('should generate correct headers', () => {
      const order = createOrder();
      const csv = generateOrderCSV(order);
      const headers = csv.split('\n')[0];
      expect(headers).toBe('參與者,項目,數量,單價,選項,小計,付款狀態');
    });

    it('should handle unpaid status correctly', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Alice' }),
            items: [createCartItem({ item: createItem({ price: 50 }), quantity: 1 })],
            paid: false,
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('未付');
    });
  });

  describe('Empty Orders', () => {
    it('should handle order with no participants', () => {
      const order = createOrder({ participants: [] });
      const csv = generateOrderCSV(order);
      expect(csv).toBe('參與者,項目,數量,單價,選項,小計,付款狀態');
    });

    it('should handle participant with no items', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Empty User' }),
            items: [],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // Should only have headers since participant has no items
      expect(csv).toBe('參與者,項目,數量,單價,選項,小計,付款狀態');
    });

    it('should handle completely empty order data gracefully', () => {
      const order = createOrder({
        participants: [],
        availableItems: [],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toBe('參與者,項目,數量,單價,選項,小計,付款狀態');
    });
  });

  describe('Special Characters Handling', () => {
    it('should handle names with commas', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Smith, John' }),
            items: [createCartItem({ quantity: 1 })],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // Note: Current implementation doesn't escape commas in names
      // This test documents the current behavior
      expect(csv).toContain('Smith, John');
    });

    it('should handle item names with commas', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ name: 'Coffee, Latte Style' }),
                quantity: 1,
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('Coffee, Latte Style');
    });

    it('should handle item names with quotes', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ name: '"Special" Brew' }),
                quantity: 1,
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('"Special" Brew');
    });

    it('should handle attributes with special characters', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                selectedAttributes: { 
                  'size': 'Large, Extra', 
                  'notes': 'Use "less" sugar' 
                },
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('size: Large, Extra');
      expect(csv).toContain('notes: Use "less" sugar');
    });

    it('should handle Chinese characters correctly', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: '王小明' }),
            items: [
              createCartItem({
                item: createItem({ name: '珍珠奶茶' }),
                selectedAttributes: { '甜度': '半糖' },
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('王小明');
      expect(csv).toContain('珍珠奶茶');
      expect(csv).toContain('甜度: 半糖');
    });

    it('should handle emoji in names', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Alice 🎉' }),
            items: [
              createCartItem({
                item: createItem({ name: 'Party Tea 🧋' }),
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain('Alice 🎉');
      expect(csv).toContain('Party Tea 🧋');
    });

    it('should handle newline characters in attributes', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                selectedAttributes: { 'notes': 'Line1\nLine2' },
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // The newline should be preserved within the quoted field
      expect(csv).toContain('notes: Line1\nLine2');
    });
  });

  describe('Complex Attribute Calculations', () => {
    it('should calculate price correctly with single attribute addon', () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: 'Size',
        options: [
          createAttributeOption({ id: 'small', value: 'Small', price: 0 }),
          createAttributeOption({ id: 'large', value: 'Large', price: 10 }),
        ],
      });

      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ 
                  name: 'Coffee', 
                  price: 50, 
                  attributes: [sizeAttr] 
                }),
                quantity: 2,
                selectedAttributes: { 'size': 'Large' },
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // Base price 50 + Large addon 10 = 60, quantity 2 = 120
      expect(csv).toContain(',120,');
    });

    it('should calculate price correctly with multiple attribute addons', () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: 'Size',
        options: [
          createAttributeOption({ id: 'large', value: 'Large', price: 10 }),
        ],
      });

      const toppingAttr = createAttribute({
        id: 'topping',
        name: 'Topping',
        options: [
          createAttributeOption({ id: 'pearl', value: 'Pearl', price: 15 }),
        ],
      });

      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ 
                  name: 'Milk Tea', 
                  price: 40,
                  attributes: [sizeAttr, toppingAttr],
                }),
                quantity: 3,
                selectedAttributes: { 
                  'size': 'Large',
                  'topping': 'Pearl',
                },
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // Base 40 + Size 10 + Topping 15 = 65, quantity 3 = 195
      expect(csv).toContain(',195,');
    });

    it('should handle items with no selected attributes', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ price: 30 }),
                quantity: 2,
                selectedAttributes: undefined,
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain(',60,'); // 30 * 2 = 60
    });

    it('should handle items with empty selected attributes', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ price: 25 }),
                quantity: 4,
                selectedAttributes: {},
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      expect(csv).toContain(',100,'); // 25 * 4 = 100
    });

    it('should handle attribute that does not exist in item definition', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ 
                  price: 50,
                  attributes: [], // No attributes defined
                }),
                quantity: 1,
                selectedAttributes: { 'nonexistent': 'value' }, // But has selection
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // Should just use base price since attribute lookup fails
      expect(csv).toContain(',50,');
    });

    it('should handle attribute option that does not exist', () => {
      const sizeAttr = createAttribute({
        id: 'size',
        name: 'Size',
        options: [
          createAttributeOption({ id: 'small', value: 'Small', price: 0 }),
        ],
      });

      const order = createOrder({
        participants: [
          createParticipant({
            items: [
              createCartItem({
                item: createItem({ 
                  price: 50,
                  attributes: [sizeAttr],
                }),
                quantity: 1,
                selectedAttributes: { 'size': 'XL' }, // Value doesn't exist
              }),
            ],
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      // Should just use base price since option lookup fails
      expect(csv).toContain(',50,');
    });
  });

  describe('Large Data Volume Tests', () => {
    it('should handle order with many participants (100+)', () => {
      const participants = Array.from({ length: 100 }, (_, i) =>
        createParticipant({
          id: `participant-${i}`,
          user: createUser({ id: `user-${i}`, name: `User ${i}` }),
          items: [
            createCartItem({
              item: createItem({ name: `Item ${i}`, price: 50 + i }),
              quantity: 1 + (i % 5),
            }),
          ],
        })
      );

      const order = createOrder({ participants });
      const csv = generateOrderCSV(order);
      
      const lines = csv.split('\n');
      expect(lines.length).toBe(101); // 1 header + 100 data rows
      expect(csv).toContain('User 0');
      expect(csv).toContain('User 99');
    });

    it('should handle participant with many items (50+)', () => {
      const items = Array.from({ length: 50 }, (_, i) =>
        createCartItem({
          item: createItem({ id: `item-${i}`, name: `Menu Item ${i}`, price: 30 + i }),
          quantity: 1 + (i % 3),
        })
      );

      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Power User' }),
            items,
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      
      const lines = csv.split('\n');
      expect(lines.length).toBe(51); // 1 header + 50 data rows
      expect(csv).toContain('Menu Item 0');
      expect(csv).toContain('Menu Item 49');
    });

    it('should handle order with complex nested attributes (stress test)', () => {
      const complexItems = Array.from({ length: 20 }, (_, i) => {
        const attrs = Array.from({ length: 5 }, (_, j) =>
          createAttribute({
            id: `attr-${i}-${j}`,
            name: `Attr ${j}`,
            options: [
              createAttributeOption({ id: `opt-${i}-${j}-1`, value: `Option A`, price: j * 5 }),
              createAttributeOption({ id: `opt-${i}-${j}-2`, value: `Option B`, price: j * 10 }),
            ],
          })
        );

        const selectedAttrs: Record<string, string> = {};
        attrs.forEach((attr, j) => {
          selectedAttrs[attr.id] = j % 2 === 0 ? 'Option A' : 'Option B';
        });

        return createCartItem({
          item: createItem({ 
            id: `complex-item-${i}`,
            name: `Complex Item ${i}`, 
            price: 100,
            attributes: attrs,
          }),
          quantity: 2,
          selectedAttributes: selectedAttrs,
        });
      });

      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Complex Order User' }),
            items: complexItems,
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      
      const lines = csv.split('\n');
      expect(lines.length).toBe(21); // 1 header + 20 data rows
      
      // Verify it doesn't crash and produces valid output
      expect(csv).toContain('Complex Order User');
      expect(csv).toContain('Complex Item 0');
      expect(csv).toContain('Complex Item 19');
    });

    it('should maintain performance with 1000 total items across participants', () => {
      const startTime = Date.now();
      
      const participants = Array.from({ length: 100 }, (_, i) =>
        createParticipant({
          id: `participant-${i}`,
          user: createUser({ id: `user-${i}`, name: `User ${i}` }),
          items: Array.from({ length: 10 }, (_, j) =>
            createCartItem({
              item: createItem({ 
                id: `item-${i}-${j}`,
                name: `Item ${i}-${j}`, 
                price: 50,
              }),
              quantity: 2,
            })
          ),
        })
      );

      const order = createOrder({ participants });
      const csv = generateOrderCSV(order);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
      
      const lines = csv.split('\n');
      expect(lines.length).toBe(1001); // 1 header + 1000 data rows
    });
  });

  describe('Multiple Participants & Items Integration', () => {
    it('should correctly aggregate multiple participants with multiple items', () => {
      const order = createOrder({
        participants: [
          createParticipant({
            user: createUser({ name: 'Alice' }),
            items: [
              createCartItem({ 
                item: createItem({ name: 'Tea', price: 30 }), 
                quantity: 2 
              }),
              createCartItem({ 
                item: createItem({ name: 'Cookie', price: 20 }), 
                quantity: 3 
              }),
            ],
            paid: true,
          }),
          createParticipant({
            user: createUser({ name: 'Bob' }),
            items: [
              createCartItem({ 
                item: createItem({ name: 'Coffee', price: 45 }), 
                quantity: 1 
              }),
            ],
            paid: false,
          }),
          createParticipant({
            user: createUser({ name: 'Charlie' }),
            items: [
              createCartItem({ 
                item: createItem({ name: 'Tea', price: 30 }), 
                quantity: 1 
              }),
              createCartItem({ 
                item: createItem({ name: 'Cake', price: 60 }), 
                quantity: 2 
              }),
            ],
            paid: true,
          }),
        ],
      });

      const csv = generateOrderCSV(order);
      const lines = csv.split('\n');
      
      expect(lines.length).toBe(6); // 1 header + 5 item rows
      
      // Verify each participant's items are present
      expect(csv).toContain('Alice,Tea,2,30');
      expect(csv).toContain('Alice,Cookie,3,20');
      expect(csv).toContain('Bob,Coffee,1,45');
      expect(csv).toContain('Charlie,Tea,1,30');
      expect(csv).toContain('Charlie,Cake,2,60');
    });
  });
});
