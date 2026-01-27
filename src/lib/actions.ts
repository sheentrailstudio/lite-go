'use server';

import { z } from 'zod';
import { generateSummaryTable } from '@/ai/flows/generate-summary-table';
import type { Order } from './definitions';

export type SummaryGenerationState = {
  summary?: string;
  error?: string;
}

export async function generateSummaryAction(order: Order): Promise<SummaryGenerationState> {
    if (order.status !== 'closed') {
        return { error: "只能為已結束的訂單產生摘要。" };
    }

    try {
        const result = await generateSummaryTable({
            orderName: order.name,
            participants: order.participants.map(p => ({
                name: p.user.name,
                items: p.items.map(i => ({
                    name: i.item.name,
                    quantity: i.quantity,
                    price: i.item.price
                }))
            })),
            settings: {
                includeNames: true,
                includeAddresses: false,
                includeEmails: false,
            }
        });
        return { summary: result.summaryTable };

    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : '發生未知錯誤。';
        return { error: `產生摘要失敗： ${errorMessage}` };
    }
}
