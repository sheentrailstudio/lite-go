'use server';

import * as cheerio from 'cheerio';

export type ScrapedItem = {
    title: string;
    price: number;
    image?: string;
    description?: string;
};

export async function scrapeProductUrl(url: string): Promise<ScrapedItem | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // General Meta Tags (Open Graph / Twitter Card) - Best for general compatibility
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const twitterTitle = $('meta[name="twitter:title"]').attr('content');
        const titleTag = $('title').text();
        
        const ogImage = $('meta[property="og:image"]').attr('content');
        const twitterImage = $('meta[name="twitter:image"]').attr('content');

        const ogDesc = $('meta[property="og:description"]').attr('content');
        const metaDesc = $('meta[name="description"]').attr('content');

        // Price is tricky. We'll look for common schema.org markup or patterns
        let price = 0;
        
        // 1. JSON-LD (Schema.org)
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '{}');
                // Check for Product schema
                if (data['@type'] === 'Product' || data['@context']?.includes('schema.org')) {
                    const offer = data.offers;
                    if (offer) {
                        const priceVal = offer.price || offer.lowPrice || offer.highPrice;
                        if (priceVal) price = parseFloat(priceVal);
                    }
                }
            } catch (e) {
                // ignore json parse error
            }
        });

        // 2. Fallback: Meta tags for price (some sites use product:price:amount)
        if (!price) {
            const ogPrice = $('meta[property="product:price:amount"]').attr('content');
            if (ogPrice) price = parseFloat(ogPrice);
        }

        // 3. Fallback: Regex search in visible text (dangerous but sometimes works)
        if (!price) {
            // Find elements that look like price
            // This is very heuristic and might need specific site adapters
        }

        return {
            title: ogTitle || twitterTitle || titleTag || '',
            image: ogImage || twitterImage,
            description: ogDesc || metaDesc,
            price: price || 0
        };

    } catch (error) {
        console.error("Scraping Error:", error);
        return null;
    }
}
