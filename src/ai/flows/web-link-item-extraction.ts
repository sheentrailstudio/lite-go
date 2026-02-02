'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WebLinkItemExtractionInputSchema = z.object({
  url: z.string().url().describe("商品的網頁連結"),
});

const WebLinkItemExtractionOutputSchema = z.object({
  name: z.string().describe("商品名稱"),
  price: z.string().describe("商品價格"),
  description: z.string().optional().describe("商品描述"),
  imageUrl: z.string().optional().describe("商品圖片連結"),
});

export type WebLinkItemExtractionInput = z.infer<typeof WebLinkItemExtractionInputSchema>;
export type WebLinkItemExtractionOutput = z.infer<typeof WebLinkItemExtractionOutputSchema>;

export async function webLinkItemExtraction(
  input: WebLinkItemExtractionInput
): Promise<WebLinkItemExtractionOutput> {
  return webLinkItemExtractionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'webLinkItemExtractionPrompt',
  input: { schema: z.object({ htmlContent: z.string() }) },
  output: { schema: WebLinkItemExtractionOutputSchema },
  prompt: `您是從網頁 HTML 中擷取商品資訊的專家。

  分析以下 HTML 內容並擷取商品名稱、價格、描述和圖片連結。
  請忽略導覽列、頁尾和廣告內容，專注於主要商品資訊。

  HTML 內容：
  {{htmlContent}}
  `,
});

const webLinkItemExtractionFlow = ai.defineFlow(
  {
    name: 'webLinkItemExtractionFlow',
    inputSchema: WebLinkItemExtractionInputSchema,
    outputSchema: WebLinkItemExtractionOutputSchema,
  },
  async (input) => {
    try {
        const response = await fetch(input.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Truncate HTML to avoid token limits if necessary (naive approach)
        const truncatedHtml = html.slice(0, 50000); 

        const { output } = await prompt({ htmlContent: truncatedHtml });
        return output!;
    } catch (error) {
        throw new Error(`Extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
