# MandiFlow — deployable offline-first mandi calculator

A static Android-friendly Progressive Web App (PWA). It uses plain HTML, CSS and JavaScript; no build step, server, API key, or paid service is required.

## Features

- Dark, high-contrast mobile UI
- Enter price once, add as many weight entries as needed
- Each positive weight entry counts as one unit
- Automatic total weight, base amount, 7% Atat, ₹10 per unit, final total
- Save paid, partial, and unpaid bills without buyer selection
- Record additional payments against unpaid bills
- Daily totals for billed amount, cash received, unpaid balance
- Record cash handovers to the owners
- Enter actual closing cash and compare with expected cash on hand
- Local device storage, JSON backup/restore, CSV export
- PWA install support and service-worker cache for offline use after first successful load

## Calculation formula

- `totalWeight = sum(all positive weight entries)`
- `base = totalWeight × pricePerKg`
- `atat = base × 0.07`
- `unitFees = numberOfPositiveWeightEntries × 10`
- `billTotal = base + atat + unitFees`

All calculations are computed in JavaScript using decimal numbers. Amounts are displayed to two decimal places. Confirm with the business whether its accounting practice requires per-line rounding or whole-rupee rounding before relying on this for official accounts.

## Deploy for free with GitHub Pages

1. Extract the ZIP.
2. Create a new GitHub repository (for example, `mandiflow`).
3. Upload `index.html`, `app.js`, `manifest.webmanifest`, `sw.js`, the `icons` folder, and this README to the repository root.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select the default branch and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish. Open the provided HTTPS URL in Chrome on Android.
7. Open the site once while online. Use Chrome's menu → **Install app** or **Add to Home screen**.
8. Test airplane mode after the first successful load. Make a test bill and export a backup.

GitHub Pages UI labels can change; use the current Pages setup instructions if necessary.

## Alternative: Netlify Drop

Upload the extracted site folder using Netlify's manual deploy/drop workflow. Use the HTTPS URL it provides. Keep the complete folder structure intact, including `icons/`.

## Important data and accounting notes

- **No cloud sync:** records are stored in this browser on this device. They do not automatically appear on another phone.
- **Back up regularly:** export JSON and store it somewhere safe. Browser data can be cleared or the phone can be lost.
- **Offline:** service worker caching works only after a successful online visit over HTTPS (or localhost during development). `file://` opening is not a supported installation method.
- **Cash model:** expected cash on hand is cash received on saved bills minus recorded handovers. It assumes a zero opening balance; if the business starts with cash already on hand, the model must be extended with an opening-cash field.
- **No identity controls:** there is no buyer selection, by design. This means the app can calculate and record transactions but cannot identify which person owes a balance.
- **Payment truth:** entering a bill does not automatically mean payment was received. Enter only the cash actually collected. Use “Save unpaid” when no cash has been received.
- **Handover proof:** handovers are recorded on this device, but the prototype does not collect an owner's signature or verify the recipient's identity.
- **Not a regulated accounting system:** test calculations and reconcile with the existing diary before relying on it for real financial records. The app does not send money or connect to a bank/UPI service.

## Local test

You can use Python's built-in static server on a computer:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in that computer's browser. For testing on a phone, deploy over HTTPS or use a development server configured for the local network; service-worker installation needs a secure context.

## Files

- `index.html` — app interface
- `app.js` — calculation, records, cash handovers, exports/imports
- `manifest.webmanifest` — install metadata
- `sw.js` — offline cache
- `icons/` — app icons
