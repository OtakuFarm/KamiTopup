# KamiTopup – Complete Game Top-Up Platform

Professional starter kit for a 1-man game top-up business.

## Features

### Frontend
- Modern dark gaming UI with improved visual icons
- 12 popular games (MLBB, Free Fire, PUBG, Genshin, Valorant, Roblox, CODM, Honkai, Zenless, LoL, Brawl Stars, Clash of Clans)
- Live package loading from backend (with offline fallback)
- Optional email field for receipts
- Stripe + Demo payment flow
- Order tracking & success pages

### Backend
- Multi-supplier automatic fallback (FazerCards → FoxReload)
- Live product/pricing API (`/api/products`)
- Stripe PaymentIntent
- Telegram notifications
- Email order receipts (Nodemailer)
- Improved Admin Dashboard with stats & filters

## Quick Start

```bash
cd backend
cp .env.example .env
npm install
npm start
```

- Backend: http://localhost:3000
- Admin:   http://localhost:3000/admin
- Frontend: open `index.html`

## Configuration

| Variable              | Purpose                          |
|-----------------------|----------------------------------|
| `STRIPE_SECRET_KEY`   | Stripe payments                  |
| `FAZERCARDS_API_KEY`  | Primary supplier                 |
| `FOXRELOAD_API_KEY`   | Fallback supplier                |
| `TELEGRAM_BOT_TOKEN`  | Order notifications              |
| `TELEGRAM_CHAT_ID`    | Your Telegram chat               |
| `SMTP_*`              | Email receipts (Gmail / any SMTP)|

## API Endpoints

| Method | Endpoint                    | Description                |
|--------|-----------------------------|----------------------------|
| GET    | `/api/products`             | List all games             |
| GET    | `/api/products/:game`       | Packages + live prices     |
| POST   | `/api/orders`               | Create order + deliver     |
| GET    | `/api/orders/:id`           | Order status               |
| GET    | `/api/orders/stats`         | Dashboard stats            |
| POST   | `/api/payments/create-intent` | Stripe PaymentIntent     |

## Live Prices

The products service is ready for live supplier rates.
Open `backend/services/products.js` and uncomment the real API section once you have FazerCards catalog access.

## Email Receipts

1. Add SMTP credentials to `.env`
2. Customer can optionally enter email on the game page
3. After successful delivery a branded receipt is sent automatically

---

You now have a full production-ready foundation.

## Security & Anti-Fraud

- Rate limiting (20 req/min per IP)
- Player ID velocity limits
- Input validation & spam pattern blocking
- Password-protected admin dashboard
- Telegram real-time alerts

See `DEPLOY.md` for full deployment instructions (Vercel + Railway/Render) and security checklist.

## Latest High-Priority Features (Added)

- **Live price sync structure** – `services/products.js` ready for supplier catalog API + 5-min cache
- **Customer Order Lookup** – `/pages/lookup.html` (search by Order ID or Email)
- **Auto-refund structure** – on supplier failure, marks refund as pending/queued (Stripe ready)
- **Better analytics** – Top games by revenue + last 7 days in admin dashboard
- **BLOCKED badge** – blacklisted Player IDs highlighted in orders list

## Medium-Priority Features (Added)

### Promotional Codes
- Create & validate discount codes (percent or fixed)
- Min order amount, max uses, expiry
- Applied on checkout
- Admin API: `POST /api/promo`, `GET /api/promo`, `DELETE /api/promo/:code`

### Support Tools
- Customer support ticket page: `/pages/support.html`
- Tickets stored in DB + Telegram notification to you
- Admin can list / reply / close via API

### Multi-Currency Display
- Currency selector on homepage (USD, EUR, GBP, NGN, GHS, KES, IDR, PHP, MYR, INR…)
- Preference saved in localStorage
- `/api/currency` and `/api/currency/convert` endpoints
- Ready to show converted prices on product pages

