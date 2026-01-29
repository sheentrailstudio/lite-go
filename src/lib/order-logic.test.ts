import { describe, it, expect } from 'vitest';
import { isOrderOpen, calculateCartItemTotal, calculateParticipantTotal } from './order-logic';
import type { Order, Item, CartItem } from './definitions';

describe('Order Logic Tests', () => {
    
    // 模擬一個基本訂單
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
        initiator: {} as any // mock
    };

    describe('isOrderOpen', () => {
        it('should return true for a normal open order', () => {
            const { isOpen } = isOrderOpen(baseOrder);
            expect(isOpen).toBe(true);
        });

        it('should return false if status is closed', () => {
            const closedOrder = { ...baseOrder, status: 'closed' as const };
            const { isOpen, reason } = isOrderOpen(closedOrder);
            expect(isOpen).toBe(false);
            expect(reason).toBe('訂單已結束');
        });

        it('should return false if maxParticipants limit is reached', () => {
            const fullOrder = { 
                ...baseOrder, 
                maxParticipants: 2, 
                participants: [{} as any, {} as any] // 2 participants
            };
            const { isOpen, reason } = isOrderOpen(fullOrder);
            expect(isOpen).toBe(false);
            expect(reason).toBe('名額已滿');
        });

        it('should return true if maxParticipants is set but not reached', () => {
            const notFullOrder = { 
                ...baseOrder, 
                maxParticipants: 5, 
                participants: [{} as any, {} as any] // 2 participants
            };
            const { isOpen } = isOrderOpen(notFullOrder);
            expect(isOpen).toBe(true);
        });

        it('should return false if deadline has passed', () => {
            const pastDate = new Date();
            pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago
            
            const expiredOrder = { 
                ...baseOrder, 
                deadline: pastDate.toISOString() 
            };
            const { isOpen, reason } = isOrderOpen(expiredOrder);
            expect(isOpen).toBe(false);
            expect(reason).toBe('已過截止時間');
        });
    });

    describe('calculateCartItemTotal', () => {
        const mockItem: Item = {
            id: 'item-1',
            name: 'Coffee',
            price: 50,
            attributes: [
                {
                    id: 'size',
                    name: 'Size',
                    options: [
                        { id: 'm', value: 'M', price: 0 },
                        { id: 'l', value: 'L', price: 10 }
                    ]
                }
            ]
        };

        it('should calculate basic price correctly', () => {
            const cartItem: CartItem = {
                item: mockItem,
                quantity: 2
            };
            // 50 * 2 = 100
            expect(calculateCartItemTotal(cartItem)).toBe(100);
        });

        it('should include attribute option price', () => {
            const cartItem: CartItem = {
                item: mockItem,
                quantity: 2,
                selectedAttributes: {
                    'size': 'L' // +10
                }
            };
            // (50 + 10) * 2 = 120
            expect(calculateCartItemTotal(cartItem)).toBe(120);
        });
    });
});
