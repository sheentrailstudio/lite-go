'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getRelevantHtml } from '@/lib/utils';

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
  prompt: `您是一位專精於電子商務數據擷取的專家。

  分析以下從網頁擷取的內容（包含 Meta 標籤與 HTML 片段），並精確提取商品的關鍵資訊。

  【目標】
  - 商品名稱 (name)
  - 價格 (price): 僅提取數字。
  - 描述 (description): 簡短的產品摘要。
  - 圖片連結 (imageUrl): 優先尋找 og:image 或主要商品圖。

  【擷取內容】
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            throw new Error(`無法讀取網址: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const relevantHtml = getRelevantHtml(html);

        const { output } = await prompt({ htmlContent: relevantHtml });
        return output!;
    } catch (error) {
        console.error("Link Extraction Detail Error:", error);
        throw new Error(`擷取失敗：這可能是因為該網站阻擋了自動化存取，或者網址格式不正確。`);
    }
  }
);
