# 🚀 K&R Photography — Production Launch & Post-Cutover Checklist

This document contains all pre-launch environment configurations, DNS settings, and post-cutover operational tasks for **kandrpix.com**.

---

## 🛠️ Part 1: Pre-Cutover Setup (Vercel & Environment Variables)

Before pointing the domain from GoDaddy, add these environment variables into your **Vercel Project Settings** (`Settings ➔ Environment Variables`):

| Variable Name | Production Value | Purpose |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | *(Copy from local .env)* | Sends booking alert & confirmation emails |
| `STUDIO_EMAIL` | `kimberly@kandrpix.com` | Primary recipient for new inquiry notifications |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` *(update to verified domain later)* | Sender address for emails via Resend |
| `TEST_EMAIL` | *(Leave empty in production)* | When empty, emails route directly to Kimberly & Rick |
| `GOOGLE_CALENDAR_ICAL_URL` | *(Copy Rick's Secret iCal URL from .env)* | Real-time booking calendar slot blocker |
| `PUBLIC_POSTHOG_KEY` | *(Copy from local .env)* | PostHog web analytics token |
| `PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog ingest endpoint |

### 📅 Calendar Feed Task (When Talking with Rick)
1. Open Rick's Google Calendar on desktop.
2. Go to: `Gear Icon ⚙️ ➔ Settings ➔ Settings for my calendars ➔ [Primary Calendar] ➔ Integrate calendar`.
3. Scroll down to **"Secret address in iCal format"** (looks like `https://calendar.google.com/calendar/ical/rpuglisi55%40gmail.com/private-xxxxxx/basic.ics`).
4. Copy that URL and update `GOOGLE_CALENDAR_ICAL_URL` in `.env` and Vercel Environment Variables.

---

## 🌐 Part 2: GoDaddy DNS Cutover Checklist

In GoDaddy (`Domain Management ➔ kandrpix.com ➔ DNS Records`):

- [ ] **A Record (`@`)**: Point `@` to Vercel IP `76.76.21.21`.
- [ ] **CNAME Record (`www`)**: Point `www` to `cname.vercel-dns.com`.
- [ ] **Verify SSL**: Wait 5–15 minutes for Vercel to issue the Let’s Encrypt SSL certificate.

---

## 📋 Part 3: Post-DNS Switch Checklist (What to Do After Going Live)

Complete these items immediately after `kandrpix.com` is resolving to the new site:

### 1. 📧 Verify Sending Domain in Resend
- [ ] Go to [Resend.com](https://resend.com) ➔ **Domains** ➔ **Add Domain** (`kandrpix.com`).
- [ ] Add the provided 3 DNS records (DKIM, SPF TXT records) into GoDaddy DNS.
- [ ] Once verified, change `RESEND_FROM_EMAIL` in Vercel to `inquiries@kandrpix.com` or `hello@kandrpix.com`.

### 2. 🧪 Live Booking Form Test
- [ ] Go to `https://kandrpix.com/contact`.
- [ ] Submit a live test booking inquiry.
- [ ] Confirm:
  - Kimberly & Rick receive the lead alert.
  - The client receives the automated branded confirmation email.
  - The `inquiry_submitted` event appears in PostHog Activity.

### 3. 🔄 Test 301 Redirects from Old Wix URLs
Test these URLs in your browser to verify they redirect without 404s:
- [ ] `https://kandrpix.com/book-online` ➔ Redirects to `/contact`
- [ ] `https://kandrpix.com/about-5` ➔ Redirects to `/#about`
- [ ] `https://kandrpix.com/gallery` ➔ Redirects to `/portfolio`
- [ ] `https://kandrpix.com/service-page/wedding-photography` ➔ Redirects to `/weddings-and-couples`
- [ ] `https://kandrpix.com/service-page/1-hour-session` ➔ Redirects to `/family-and-portraits`
- [ ] `https://kandrpix.com/service-page/real-estate-drone` ➔ Redirects to `/real-estate`

### 4. 📍 Update Google Business Profile (GBP) Links
In Google Business Profile (`Edit profile ➔ Contact`):
- [ ] **Website Button**:
  ```text
  https://kandrpix.com?utm_source=gbp&utm_medium=organic&utm_campaign=gmb_website
  ```
- [ ] **Appointments / Booking Link**:
  ```text
  https://kandrpix.com/contact?utm_source=gbp&utm_medium=organic&utm_campaign=gmb_appointment
  ```

### 5. 🔍 Submit Sitemap to Google Search Console
- [ ] Open Google Search Console for `kandrpix.com`.
- [ ] Request URL indexing for `https://kandrpix.com`.

### 6. 👥 Invite Kimberly & Rick to PostHog
- [ ] In PostHog: `Settings ➔ Organization ➔ Members ➔ Invite Member`.
- [ ] Send an invitation to `kimberly@kandrpix.com` so they can view traffic charts and session replays.

### 7. 🛡️ Optional Layer 3 Bot Protection: Cloudflare Turnstile (Post-Launch)
- [ ] Sign up for a free Cloudflare account & create a Turnstile widget for `kandrpix.com`.
- [ ] Add `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` into Vercel environment variables.
- [ ] Enable the Turnstile invisible token verification check in `src/pages/api/booking.ts`.

### 8. 🎥 Client Handoff Video (Loom)
- [ ] Record a 3-minute video walking Kimberly & Rick through:
  - How lead notifications arrive in their inbox.
  - How calendar blocks prevent double bookings.
  - How to look at PostHog analytics.
