'use server';

/**
 * @fileOverview 訂單截止後自動產生 Excel 風格的摘要表。
 *
 * - generateSummaryTable - 一個產生摘要表的函式。
 * - GenerateSummaryTableInput - generateSummaryTable 函式的輸入類型。
 * - GenerateSummaryTableOutput - generateSummaryTable 函式的返回類型。
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSummaryTableInputSchema = z.object({
  orderName: z.string().describe('訂單的名稱。'),
  participants: z
    .array(
      z.object({
        name: z.string().describe('參與者的姓名。'),
        items: z
          .array(
            z.object({
              name: z.string().describe('商品的名稱。'),
              quantity: z.number().describe('商品的數量。'),
              price: z.number().describe('商品的價格。'),
            })
          )
          .describe('參與者訂購的商品。'),
      })
    )
    .describe('訂單的參與者。'),
  settings: z
    .object({
      includeNames: z
        .boolean()
        .default(true)
        .describe('是否在摘要中包含參與者姓名。'),
      includeAddresses: z
        .boolean()
        .default(false)
        .describe('是否在摘要中包含參與者地址。'),
      includeEmails: z
        .boolean()
        .default(false)
        .describe('是否在摘要中包含參與者電子郵件。'),
    })
    .describe('摘要表產生的設定。'),
});
export type GenerateSummaryTableInput = z.infer<
  typeof GenerateSummaryTableInputSchema
>;

const GenerateSummaryTableOutputSchema = z.object({
  summaryTable: z
    .string()
    .describe(
      '產生的摘要表，格式適合顯示，例如 markdown 表格。'
    ),
});
export type GenerateSummaryTableOutput = z.infer<
  typeof GenerateSummaryTableOutputSchema
>;

export async function generateSummaryTable(
  input: GenerateSummaryTableInput
): Promise<GenerateSummaryTableOutput> {
  return generateSummaryTableFlow(input);
}

const generateSummaryTablePrompt = ai.definePrompt({
  name: 'generateSummaryTablePrompt',
  input: {schema: GenerateSummaryTableInputSchema},
  output: {schema: GenerateSummaryTableOutputSchema},
  prompt: `您是為團購產生摘要表的專家。

  根據以下訂單資訊，產生一份摘要表，顯示每位參與者的項目數量和總成本。

  訂單名稱: {{{orderName}}}

  參與者:
  {{#each participants}}
  - 姓名: {{{name}}}
    項目:
    {{#each items}}
    - 名稱: {{{name}}}, 數量: {{{quantity}}}, 價格: {{{price}}}
    {{/each}}
  {{/each}}

  設定:
  - 包含姓名: {{{settings.includeNames}}}
  - 包含地址: {{{settings.includeAddresses}}}
  - 包含電子郵件: {{{settings.includeEmails}}}

  請使用 markdown 格式化表格。
  `,
});

const generateSummaryTableFlow = ai.defineFlow(
  {
    name: 'generateSummaryTableFlow',
    inputSchema: GenerateSummaryTableInputSchema,
    outputSchema: GenerateSummaryTableOutputSchema,
  },
  async input => {
    const {output} = await generateSummaryTablePrompt(input);
    return output!;
  }
);
