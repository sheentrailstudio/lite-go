# **App Name**: Lite Go: Group Buy Tool

## Core Features:

- Manual Item Creation: Allow users to manually add items for group buying with details like name, price, and quantity.
- Image to Item Conversion (OCR): Use Tesseract.js to convert menu images into item listings.
- Web Link Item Extraction: Extract product information automatically from web links using Cheerio or Playwright.
- Order Condition Setting: Allow the group initiator to set order conditions such as deadline, target amount, or number of participants.
- Automatic Excel-style Summary Table: Automatically generate an Excel-style summary table after the order deadline, including item quantities and total costs for each participant. It includes a reasoning tool which decides how to present numerical summaries, and how to render names, addresses, or emails when that is enabled in the settings.
- User Order History: Maintain two separate lists for each user: 'My Initiated Orders' and 'My Participated Orders'.
- Authentication: Secure user authentication via Supabase or Firebase.

## Style Guidelines:

- Primary color: Soft teal (#70c5b5) to evoke a sense of ease and naturalness, and to project a trustworthy image.
- Background color: Light off-white (#F5F5DC), providing a clean and unobtrusive backdrop.
- Accent color: Soft orange (#FFB347) to highlight key interactive elements like call-to-action buttons and important notifications, creating a sense of warmth.
- Body and headline font: 'PT Sans', a humanist sans-serif for both headlines and body, which is easy to read.
- Use Lucide React icons for a clean and consistent visual language.
- Uber Eats-inspired clean and efficient layout.
- Subtle animations for loading states and transitions.