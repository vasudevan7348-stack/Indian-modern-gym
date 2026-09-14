<<<<<<< HEAD
# Pulse Gym - Clean & Minimal Owner Operations Dashboard

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

1. **Clean & Minimal Obsidian Interface**:
   - High readability, sleek dark mode aesthetics.
   - Zero visual clutter, smooth micro-transitions.

2. **Executive KPI Cards**:
   - **Total Members / Sign-ups**
   - **Active Memberships**
   - **Expiring Soon (within 7 days)** with color-coded alerts
   - **Collected Revenue** calculation
   - **Morning vs Evening Slot Occupancy**

3. **Multi-Source Google Sheet Sync**:
   - **Live Google Sheet Sync**: Connects to your Google Sheet link (`https://docs.google.com/spreadsheets/d/12hTWm6WIPbimEjmwdz2Q_SX2FhDMBfM6VTaDd2Dzsd0`).
   - **Flexible Column Matcher**: Automatically recognizes columns regardless of naming conventions (`Full Name`, `Phone`, `Plan`, `Fitness Goal`, etc.).
   - **Instant CSV Dropzone**: Drag & drop any exported CSV file for offline, zero-latency sync.
   - **Google Apps Script Webhook**: Ready-to-copy trigger script for instant real-time sync when a Google Form is submitted.

4. **1-Click WhatsApp & Call Integration**:
   - Direct WhatsApp button for every customer.
   - Pre-formatted messages for:
     - **Welcome & Onboarding**
     - **Membership Renewal Reminder**
     - **Workout Progress Check-in**

5. **Operations Management**:
   - Quick Renew (+1 Month, +3 Months) directly updates membership expiration and revenue.
   - Instant Search (`/` key) across customer names, phone numbers, plans, and goals.
   - Filters by Status (*All, Active, Expiring, Leads, Expired*), Plan, and Slot.
   - View mode toggle (Sleek Data Table vs Visual Cards Grid).
   - Export filtered member data to CSV anytime.
   - Walk-in / New Member registration modal.

---

## How to Run Locally

You can serve the directory using any static web server:

```powershell
# Using npx serve (recommended)
npx serve . -p 3000

# Or using Python:
python -m http.server 3000
```
Then open `http://localhost:3000` in your browser.
=======
# Indian-modern-gym
>>>>>>> aa280640dcf04f34ac0ade8831501aa67f6fafd1
