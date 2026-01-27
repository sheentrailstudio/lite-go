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
  prompt: `您是從圖片中擷取菜單項目及其價格的專家。

  分析圖片並擷取項目名稱及其對應的價格。以 JSON 格式返回資料。
  請勿包含任何描述，僅包含項目名稱和價格。

  圖片：{{media url=photoDataUri}}
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
