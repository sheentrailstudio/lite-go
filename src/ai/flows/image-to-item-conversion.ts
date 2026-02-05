'use server';

/**
 * @fileOverview 將菜單圖片轉換為包含名稱和價格的項目列表。
 *
 * - imageToItemConversion - 處理圖片到項目轉換過程的函式。
 * - ImageToItemConversionInput - imageToItemConversion 函式的輸入類型。
 * - ImageToItemConversionOutput - imageToItemConversion 函式的返回類型。
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImageToItemConversionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "菜單的照片，格式為 data URI，必須包含 MIME 類型並使用 Base64 編碼。預期格式：'data:<mimetype>;base64,<encoded_data>'。"
    ),
});
export type ImageToItemConversionInput = z.infer<typeof ImageToItemConversionInputSchema>;

const ImageToItemConversionOutputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('項目的名稱。'),
      price: z.string().describe('項目的價格。'),
    })
  ).describe('從菜單圖片中擷取的項目列表。'),
});
export type ImageToItemConversionOutput = z.infer<typeof ImageToItemConversionOutputSchema>;

export async function imageToItemConversion(
  input: ImageToItemConversionInput
): Promise<ImageToItemConversionOutput> {
  return imageToItemConversionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'imageToItemConversionPrompt',
  input: {schema: ImageToItemConversionInputSchema},
  output: {schema: ImageToItemConversionOutputSchema},
  prompt: `您是一位專業的選單與價目表解析專家。

  您的任務是從提供的圖片中精確擷取所有商品項目及其價格。
  
  【指令】
  1. 仔細掃描圖片中的所有文字。
  2. 辨識出具有「名稱」與「金額」關係的配對。
  3. 如果一個商品有多個尺寸（例如 M: 30, L: 45），請將其拆分為不同的項目（例如："茉莉綠茶 (M)", "茉莉綠茶 (L)"）。
  4. 僅返回純粹的 JSON 列表，不包含任何額外解釋或 Markdown 標籤。
  5. 確保價格僅包含數字。

  圖片內容：{{media url=photoDataUri}}
  `,
});

const imageToItemConversionFlow = ai.defineFlow(
  {
    name: 'imageToItemConversionFlow',
    inputSchema: ImageToItemConversionInputSchema,
    outputSchema: ImageToItemConversionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
