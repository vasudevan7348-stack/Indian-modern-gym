# Indian Modern Gym - Owner Operations Dashboard

A clean, minimalist, high-performance web dashboard built specifically for gym owners to manage customer registrations, inquiries, renewals, and operations.

## Complete Pipeline
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
│    Customer     │ ───>  │   Google Form   │ ───>  │  Google Sheet   │ ───>  │  Custom App & Owner    │
│  (Registration) │       │   (Responses)   │       │   (Live Data)   │       │       Dashboard        │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └────────────────────────┘
```

---

## Key Features

1. **Clean & Minimal Interface**:
   - High readability, sleek dark mode aesthetics.
   - Zero visual clutter, smooth micro-transitions.

2. **Executive KPI Cards**:
   - **Total Members / Sign-ups**
   - **Active Memberships**
   - **Expiring Soon (within 7 days)** with color-coded alerts

3. **Multi-Source Google Sheet Sync**:
   - **Live Google Sheet Sync (CORS-Proof JSONP)**: Connects to your Google Sheet link in real time without third-party proxies.
   - **Flexible Column Matcher**: Automatically recognizes columns regardless of naming conventions (`Full Name`, `Phone`, `Plan`, `Fitness Goal`, etc.).
   - **Instant CSV Dropzone**: Drag & drop any exported CSV file for offline, zero-latency sync.

4. **1-Click WhatsApp Integration**:
   - Direct clickable WhatsApp numbers in light green.
   - Pre-formatted welcome and renewal messages.

5. **Operations Management**:
   - Exact Day Durations: 1m = 30 days, 3m = 90 days, 6m = 180 days, 12m = 360 days.
   - Clean color-coded Expiry tags (green >7d, yellow <=7d, red 0d).
   - Dynamic real-time calendar countdown.

---

## How to Run Locally

```powershell
# Using npx serve (recommended)
npx serve . -p 3000

# Or using Python:
python -m http.server 3000
```
Then open `http://localhost:3000` in your browser.
