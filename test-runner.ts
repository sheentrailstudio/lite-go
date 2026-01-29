import { isOrderOpen, calculateCartItemTotal } from './src/lib/order-logic';
import type { Order, Item, CartItem } from './src/lib/definitions';

// 簡單的斷言函數
function expect(actual: any) {
    return {
        toBe: (expected: any) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        }
    }
}

function runTest(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (e: any) {
        console.error(`❌ ${name}: ${e.message}`);
        process.exit(1);
    }
}

console.log('🚀 Running Tests...\n');

// 準備測試資料
const baseOrder: Order = {
    id: 'order-1',
    name: 'Test Order',
    description: '',
    status: 'open',
    visibility: 'public',
    initiatorId: 'user-1',
    initiatorName: 'User',
    createdAt: new Date().toISOString(),
    participants: [],
    availableItems: [],
    initiator: {} as any
};

// 測試案例 1: 正常開放
runTest('isOrderOpen: returns true for open order', () => {
    const { isOpen } = isOrderOpen(baseOrder);
    expect(isOpen).toBe(true);
});

// 測試案例 2: 已結單
runTest('isOrderOpen: returns false for closed order', () => {
    const closedOrder = { ...baseOrder, status: 'closed' as const };
    const { isOpen } = isOrderOpen(closedOrder);
    expect(isOpen).toBe(false);
});

// 測試案例 3: 人數已滿
runTest('isOrderOpen: returns false when full', () => {
    const fullOrder = { 
        ...baseOrder, 
        maxParticipants: 2, 
        participants: [{} as any, {} as any] 
    };
    const { isOpen } = isOrderOpen(fullOrder);
    expect(isOpen).toBe(false);
});

// 測試案例 4: 金額計算
runTest('calculateCartItemTotal: calculates correctly with options', () => {
    const mockItem: Item = {
        id: 'item-1',
        name: 'Coffee',
        price: 50,
        attributes: [
            {
                id: 'size',
                name: 'Size',
                options: [
                    { id: 'l', value: 'L', price: 10 }
                ]
            }
        ]
    };

    const cartItem: CartItem = {
        item: mockItem,
        quantity: 2,
        selectedAttributes: { 'size': 'L' }
    };

    // (50 + 10) * 2 = 120
    expect(calculateCartItemTotal(cartItem)).toBe(120);
});

console.log('\n✨ All tests passed!');
