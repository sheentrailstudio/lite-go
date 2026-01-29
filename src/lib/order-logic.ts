import type { Order, CartItem, Item } from './definitions';

/**
 * 檢查訂單是否開放加入
 * 條件：
 * 1. 狀態必須為 'open'
 * 2. 如果有人數限制，目前人數必須小於上限
 * 3. 如果有截止時間，目前時間必須早於截止時間
 */
export function isOrderOpen(order: Order, currentTime: Date = new Date()): { isOpen: boolean; reason?: string } {
    if (order.status !== 'open') {
        return { isOpen: false, reason: '訂單已結束' };
    }

    if (order.maxParticipants && order.participants.length >= order.maxParticipants) {
        return { isOpen: false, reason: '名額已滿' };
    }

    if (order.deadline) {
        const deadlineDate = new Date(order.deadline);
        if (currentTime > deadlineDate) {
            return { isOpen: false, reason: '已過截止時間' };
        }
    }

    return { isOpen: true };
}

/**
 * 計算購物車項目的總金額
 * 公式：(商品單價 + 所有選配屬性的加價) * 數量
 */
export function calculateCartItemTotal(cartItem: CartItem): number {
    let unitPrice = cartItem.item.price;

    if (cartItem.selectedAttributes) {
        Object.entries(cartItem.selectedAttributes).forEach(([attrId, optionValue]) => {
            const attribute = cartItem.item.attributes?.find(a => a.id === attrId);
            const option = attribute?.options.find(o => o.value === optionValue);
            if (option?.price) {
                unitPrice += option.price;
            }
        });
    }

    return unitPrice * cartItem.quantity;
}

/**
 * 計算整張訂單的參與者總金額
 */
export function calculateParticipantTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + calculateCartItemTotal(item), 0);
}
