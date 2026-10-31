# CropScan AI (किसान फसल डॉक्टर)
> **Snap a leaf, know the cure.** • *पत्ते की फोटो लो, बीमारी पहचानो और सही सस्ता इलाज जानो।*

CropScan AI is a mobile-first Progressive Web Application (PWA) designed to empower farmers across India. By photographing a diseased or discolored crop leaf, farmers receive instant AI diagnosis of plant diseases, pest infestations, and nutrient deficiencies, along with cost-effective organic remedies, spray weather advice, and official agricultural support.

---

## Key Features

1. **AI Leaf Diagnosis & Pathology**
   - Multimodal image diagnosis powered by Google Gemini AI with resilient automatic retry (1s, 2s, 4s exponential backoff) and model fallback.
   - 3 optional contextual questions before scanning (symptom onset days, field spread, recent chemical applications).
   - Identifies whether the photo is a valid plant leaf; ignores non-plant photos with helpful photography tips.

2. **Cheap & Local Remedy vs Chemical Option with Cost Estimates**
   - Prioritizes affordable, organic, and household solutions (sour buttermilk, neem oil, bio-fungicides).
   - Side-by-side cost comparison in INR per acre between local remedies and chemical alternatives.
   - Highlights potential savings and explicit *"Do NOT Buy"* warnings to protect farmers from predatory pesticide dealers.

3. **Weather-Based Spray Advice (Open-Meteo API)**
   - Automatic browser geolocation with manual city/district search fallback (no API key required).
   - 3-day forecast tracking maximum rain probability, temperature range, and wind speed.
   - Agricultural decision tree:
     - **Rain > 50% in next 24 hours**: *"Don't spray today, rain expected"* (prevents rain wash-off).
     - **Wind > 15 km/h**: *"Wind is high, avoid spraying"* (prevents chemical drift hazard).
     - **Otherwise**: *"Good time to spray"*.

4. **Kisan Call Centre & KVK Locator**
   - Tap-to-call button for the Ministry of Agriculture's toll-free **Kisan Call Centre (1800-180-1551)** (6:00 AM – 10:00 PM, all 7 days).
   - Direct link to the official Indian Council of Agricultural Research (ICAR) **Krishi Vigyan Kendra (KVK)** district locator.

5. **7 Indian Languages & Web Speech ("Listen")**
   - Complete localized UI and AI diagnostic responses in **Hindi (हिन्दी)**, **English**, **Marathi (मराठी)**, **Punjabi (ਪੰਜਾਬੀ)**, **Gujarati (ગુજરાતી)**, **Tamil (தமிழ்)**, and **Telugu (తెలుగు)**.
   - Web Speech API text-to-speech button reading problem name, cause, remedy, and warnings aloud in native language voice.

6. **Farm Analytics Dashboard ([`/dashboard`](file:///c:/project2/src/app/dashboard/page.tsx))**
   - Total scans, healthy crops vs disease and pest counts.
   - Top 5 recurring problems displayed in an accessible horizontal bar chart.
   - Crop distribution breakdown (Wheat, Rice, Tomato, Potato, Cotton, etc.).

7. **Supabase Authentication & History**
   - Email/password authentication with Google OAuth integration.
   - Scanned leaf photos compressed client-side and saved to Supabase Storage (`crop-images`).
   - Secure Row Level Security (RLS) policies protecting farmer scan records.
   - Allows guest scanning with prompt to save history to an account.

8. **Progressive Web App (PWA) & 360px Mobile First**
   - Installable PWA with web app manifest, maskable icons, and standalone display.
   - Styled using a warm cream (`#FAF6EF`) and deep green (`#2F5D3A`) agricultural palette.
   - Fully optimized for compact 360px mobile viewports with min 48px touch targets.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Diagnostics**: [Google Gemini API](https://ai.google.dev/) (`gemini-3.8-flash` / `gemini-3.5-flash-lite`)
- **Backend & Storage**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Storage)
- **Weather Service**: [Open-Meteo Forecast & Geocoding API](https://open-meteo.com/) (Free, no API key required)

---

## Environment Variables

To run CropScan AI locally and in production on Vercel, configure the following environment variables:

| Variable Name | Required | Description | Example / Default |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | API key for Gemini multimodal vision model | `AQ.Ab8...` / `AIzaSy...` |
| `GEMINI_MODEL` | No | Primary Gemini model for analysis | `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | No | Secondary model on 503/429/timeout | `gemini-3.5-flash-lite` |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project API URL | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase project publishable anon key | `sb_publishable_...` |

*(Note: Open-Meteo weather API does not require any API key or token).*

---

## Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/cropscan-ai.git
cd cropscan-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your **Google Gemini API Key** and **Supabase Project Credentials** in `.env.local`.

### 3. Initialize Supabase Database & Storage
1. Open your Supabase Project Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Copy the contents of [`supabase_schema.sql`](file:///c:/project2/supabase_schema.sql) and execute the query.
4. This creates:
   - `public.scans` table with indexed `user_id` and `created_at`.
   - Row Level Security (RLS) policies for user privacy.
   - `crop-images` public storage bucket with access policies.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment on Vercel

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New" > "Project"**.
3. Import your CropScan AI repository.
4. Under **"Environment Variables"**, add the required keys:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *(Optional)* `GEMINI_MODEL` (`gemini-3.8-flash`)
   - *(Optional)* `GEMINI_FALLBACK_MODEL` (`gemini-3.5-flash-lite`)
5. Click **"Deploy"**.
6. In your Supabase Dashboard under **Authentication > URL Configuration**, add your Vercel deployment URL (e.g. `https://your-cropscan.vercel.app`) to the **Redirect URLs** list for Google OAuth and email verification.

---

## Build Verification

To verify that the production build compiles with zero errors before pushing:
```bash
npm run build
```

---

## License

CropScan AI is built as open-source software for the welfare and empowerment of farming communities.
