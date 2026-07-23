# SB Ayurveda — sbayurveda.com

React + Vite + Tailwind CSS e-commerce storefront for SB Ayurveda ("Cheapest Ayurveda
Products Online"). Cart, wishlist, search, coupons, and checkout are fully functional
against a dummy in-memory product catalog — ready for UAT before wiring to a real backend.

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS 3
- Zustand (cart / wishlist / search / coupon state, persisted to `localStorage`)
- React Router v7
- Framer Motion (cart drawer / modal animations)
- react-hot-toast (notifications)
- lucide-react (icons)

## Folder Structure

```
src/
  components/       Header, Footer, ProductCard, CartDrawer, etc.
  components/home/  Homepage sections (Hero, FlashSale, Testimonials, ...)
  context/          Zustand store (store.js) + derived cart hook (useCart.js)
  data/             Dummy product/category/coupon/testimonial data
  pages/            Route-level pages (Home, ProductDetail, Checkout, ...)
  types/            JSDoc type definitions
  utils/            WhatsApp deep-link helpers
```

## Local Development

```bash
npm install
npm run dev       # http://localhost:5173
```

## Production Build

```bash
npm run build      # outputs to /dist
npm run preview    # sanity-check the production build locally
```

## Replacing Dummy Data with Real Products

All product data lives in [`src/data/products.js`](src/data/products.js). Each entry
has `name`, `brand`, `category`, `healthConcerns`, `mrp`, `marketPrice`, `price`,
`rating`, `reviews`, `packSize`, `description`, and flags (`isBestseller`,
`isFlashSale`). Product images currently point to placeholder URLs
(`placehold.co`) — replace `image`/`images` with real product photography before
launch. Categories, brands and health-concern taxonomy live in
[`src/data/categories.js`](src/data/categories.js).

Update the WhatsApp business number in
[`src/utils/whatsapp.js`](src/utils/whatsapp.js) (`WHATSAPP_NUMBER`) and the phone
number/email in [`src/components/Footer.jsx`](src/components/Footer.jsx) and
[`src/components/Header.jsx`](src/components/Header.jsx) before go-live.

## Deploying to Hostinger (Static Hosting)

1. **Build the site locally:**
   ```bash
   npm run build
   ```
   This creates a `dist/` folder containing `index.html`, `assets/`, `favicon.svg`,
   and `.htaccess`.

2. **Log in to Hostinger hPanel** → go to **Websites** → select `sbayurveda.com` →
   **File Manager** (or connect via FTP/SFTP using the credentials under
   **Hosting → Advanced → FTP Accounts**).

3. **Clear/back up `public_html`:** Hostinger serves the site from the
   `public_html` folder for the primary domain (or `public_html/subdomain` for a
   subdomain). Remove any placeholder `index.html` Hostinger created by default,
   but back up anything you don't recognize first.

4. **Upload the contents of `dist/`** (not the `dist` folder itself — its
   *contents*) into `public_html`. Via File Manager: zip the `dist` folder
   contents locally, upload the zip, then extract it inside `public_html`. Via
   FTP (FileZilla, Cyberduck, etc.): connect and drag the contents of `dist/`
   into `public_html`.

5. **Confirm `.htaccess` uploaded** (File Manager hides dotfiles by default —
   enable "Show Hidden Files" in settings). This file rewrites all routes to
   `index.html` so React Router's client-side routes (`/checkout`, `/product/...`,
   etc.) work correctly on refresh/direct link instead of showing a 404.

6. **SSL:** Under hPanel → **Security → SSL**, make sure a free SSL certificate
   is issued and "Force HTTPS" is enabled for sbayurveda.com.

7. **Verify:** Visit `https://sbayurveda.com`, then test a deep link directly
   (e.g. `https://sbayurveda.com/category/immunity`) to confirm the `.htaccess`
   rewrite is working.

### Redeploying after future changes

Every time you make code changes: run `npm run build` again and re-upload the new
contents of `dist/` (overwrite `public_html`). Consider setting up a simple CI/CD
(GitHub Actions → FTP deploy) once the codebase is in a git repository, so you don't
have to do this manually each time.

## What's Using Dummy/Placeholder Data (fix before real launch)

- Product images (`placehold.co` URLs in `src/data/products.js`)
- WhatsApp business number (`src/utils/whatsapp.js`)
- Phone/email/address in `Header.jsx` / `Footer.jsx`
- Payment processing on Checkout is simulated client-side (no real Razorpay/UPI
  integration yet) — order "placement" just clears the cart and shows a
  confirmation screen with a generated order ID. Wire this to a real payment
  gateway + backend order API before accepting real payments.
- Pincode delivery checker and order tracking are simulated (always show a
  positive result) — connect to real courier/logistics APIs when available.
- `index.html` references `https://sbayurveda.com/og-cover.jpg` for social share
  previews — add a real 1200×630 OG image at that path before launch.
