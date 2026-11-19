# StayDesk 1.1

A practical, bilingual hotel workspace for small hotels, inns, and guesthouses. Built with React and Vite; all operational data stays in your browser. Version 1.1 preserves the existing interface and corrects availability, navigation, workflow edge cases, and release completeness.

- [Screenshot user guide](docs/USER_GUIDE.md) — beginner-friendly workflows and success indicators.
- [Validation record](docs/VALIDATION.md) — checks, environment, and remaining limitations.
- [Private browser app](https://staydesk-willow-pms.humble-field-3507.chatgpt.site) — same private Site as version 1.0.

## Changes in 1.1

- Separates vacant/clean rooms, reserved rooms, bookable room nights, and immediately ready rooms using the same reservation segments as the calendar.
- Resets scroll position when switching main sections; resets Rooms/Housekeeping filters independently.
- Allows booking same-day turnover while still requiring physical checkout and cleaning before check-in.
- Fixes room-history validation after moves, same-day checkout inventory release, late-checkout conflicts, and maintenance/capacity guards.
- Separates full-stay payment amounts from checkout settlement. Preserves minimum checkout charges without holding released rooms.
- Saves initial data, prevents stale writes, closes outdated cross-tab drawers, and validates backup consistency before replacement.
- Includes complete source, tests, screenshots, and a reproducible packaging script. No AgentGit submission is performed by this project.

## Open the application — no terminal required

**Windows / offline**

1. Extract `StayDesk-v1.1-review.zip` using **Extract All** in File Explorer.
2. Keep the extracted folder in a permanent location.
3. Double-click **StayDesk.html**. If Windows asks for an application, choose Microsoft Edge or Google Chrome.
4. The **The Willow House** overview appears with 24 sample rooms. This is the success indicator.
5. Use the **English / 简体中文** button in the top-right corner to switch language.

No Node.js, installation, terminal, local server, or internet connection is needed for the offline application. Keep using the same browser, profile, and file location; browsers may isolate local-file storage by path. Private browsing does not provide durable storage. Export a backup before relocating the file or clearing browser data.

**Private browser edition**

When supplied with a deployed StayDesk link, open it in your browser. Access follows the Site owner's private access controls. The online and offline editions have separate browser storage; use Settings → Export backup / Restore backup to transfer records. Hosting does not synchronize hotel records between devices.

## What works

| Page | Working features |
| --- | --- |
| Overview | Daily arrivals, due/overdue departures, vacant/clean rooms, reserved rooms, bookable rooms, booked occupancy, nightly room revenue, front-desk lists, room snapshot, revenue chart, cleaning counts |
| Reservations | Search guest/name/email/ID/room; status filters; create and edit bookings; change room or dates; extend stay; cancel; payment and refund ledger |
| Room calendar | Fourteen-day room/date grid, previous/next week, date picker, room-type filter, click an empty cell to book, click a reservation to edit |
| Rooms | Occupancy/readiness cards, room details, capacity, default rate, type, notes, add rooms up to 80, maintenance blocking |
| Housekeeping | Dirty → cleaning → inspection → clean; staff assignment; notes; filters; status shared with the front desk |
| Reports | Date-range revenue and net payments, occupancy, ADR, RevPAR, daily chart/table, native `.xlsx` and UTF-8 CSV export |
| Settings | Property name, explicit business date, display currency, JSON backup/restore, sample reset, recent activity |

All modules derive from one shared state. Every operation is validated before being saved; failed operations leave the previous state intact. Sample records are fictional, with dates relative to the first launch. Initial housekeeping and maintenance states intentionally demonstrate operational exceptions.

## Try a complete hotel workflow

1. Open **Rooms** and choose a clean, vacant room, or click **Add room** to create one.
2. Click **New reservation**, enter a guest name, choose today as arrival and tomorrow as departure, assign that room, and click **Create reservation**.
   - Success: the stay appears in Reservations and on the Room calendar.
3. Open the reservation and click **Check in guest**.
   - Success: status changes to In-house and the room becomes Occupied.
4. Click **Record payment**, enter the amount received and payment method, and save.
   - Success: the ledger and balance update. This records a transaction already completed outside StayDesk; it does not process a card charge.
5. For an extension or room move, edit the departure or room assignment and **Save reservation**.
   - Success: the calendar updates. A room move preserves completed nights in the previous room and marks it dirty. Save form changes before performing another operation.
6. To check out, review **Checkout today**, record any required payment or refund, and click **Check out guest**.
   - Success: the guest becomes Checked out and the room becomes To clean. Early checkout adjusts the stay with a minimum charge of one night.
7. In **Housekeeping**, choose **Start cleaning → Finish cleaning → Mark clean**.
   - Success: the room becomes clean. Existing reservations remain protected; only an unreserved room becomes ready for a new booking.

## Operational rules

- Dates use hotel nights: arrival is inclusive and departure is exclusive. A departure and another arrival on the same date are valid bookings; the departing guest must actually check out and the room must be cleaned before the arriving guest can check in.
- Overlapping reservations for a physical room are rejected, including conflicting date changes, extensions, and room moves. Overdue in-house guests continue to block a same-day check-in.
- Check-in is available on the configured business date and requires a vacant, clean, in-service room. Advance reservations can be made for rooms awaiting cleaning.
- In-house arrival dates and nightly rates are locked. Changing a default room rate affects new reservations only. Extensions preserve the booking's nightly rate.
- In-house room moves take effect on the business date. Extend an overdue stay first. Earlier room segments remain visible on the calendar.
- Maintenance blocks the room indefinitely until cleared; move/cancel its active and future reservations first. This version has no scheduled maintenance date ranges.
- Cancellation releases room inventory and sets accommodation charges to zero. Existing payments remain in the ledger; record refunds separately. Refunds cannot exceed net payments received.
- Checkout requires a settled adjusted balance. Same-day checkout records its actual release date independently of its minimum one-night charge; inventory is released while revenue is retained. Payments can be recorded against completed stays for corrections. No card numbers should be entered.
- The business date is explicit. Advance it in Settings at the start of an operational day. It cannot move backward. There is no automatic midnight rollover or nightly housekeeping job.
- Room revenue is nightly rate allocated to booked nights, including confirmed, in-house, and completed stays. Future dates are forecasts. Cancelled stays are excluded. Net payments are grouped by the transaction's business date and include refunds as negative values.
- Occupancy = booked room nights / all physical room nights. ADR = room revenue / booked room nights. RevPAR = room revenue / all physical room nights. Maintenance rooms stay in the denominator so historical results do not change when maintenance is toggled. New rooms added in 1.1 enter capacity from their creation business date. Same-day completed stays release calendar inventory but retain minimum accommodation revenue.
- Rates exclude taxes, discounts, additional charges, commissions, and extras. USD/CNY settings change labels only; they do not perform currency conversion.

## Persistence, privacy, and backups

- Browser `localStorage` holds records under `staydesk.data.v1`; language uses `staydesk.lang`.
- Settings → **Export backup** downloads a JSON backup containing rooms, guests, payments, and activity. Store it securely.
- **Restore backup** validates schema and reservation overlaps before asking to replace current data. Export your current backup first.
- The application makes no runtime API calls, has no telemetry, and does not upload guest data. Excel export is performed locally.
- Records are not encrypted in browser storage. Protect the Windows account and browser profile used by staff.
- Tabs on the same origin receive storage updates, and Web Locks serialize writes and restores when supported. Open drawers close when another tab changes data; reopen the record to avoid stale edits. Stale revisions are rejected. This is a single-workstation version, not a concurrent multi-user database. Do not rely on separate offline tabs for simultaneous edits.
- Local browser data can be lost through clearing site data, private mode, profile loss, or storage limits. A browser workspace is not a backup system.

## Design references

Reviewed before implementation:

- [Little Hotelier](https://www.littlehotelier.com/) and its [mobile front-desk overview](https://discover.littlehotelier.com/mobile-app-lhr-en/): centralized bookings and an accessible calendar for small properties.
- [Cloudbeds daily operations](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/40771665486363-Your-Cloudbeds-PMS-Daily-Operations-Guide): arrival/departure lists, room readiness, operational actions.
- [Cloudbeds housekeeping and room status](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/48389981165083-Managing-Housekeeping-and-Room-Status-from-the-New-Calendar): shared room conditions, staff assignment, operational notes.
- [Cloudbeds reservation moves](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/55835270255131-Move-and-assign-reservations-on-the-New-Calendar): editable assignments and dates.

StayDesk uses an original layout and implementation. The calendar uses explicit editing forms instead of drag-and-drop to make validation and changes reviewable.

## Current boundaries

This version includes the requested core workflows for local use and final review. It does not include OTA/channel synchronization, online booking distribution, payment processing, staff authentication/roles, multi-device synchronization, tax accounting, invoices, multi-room group reservations, or automatic night audit. It uses three room-type categories and supports adding rooms up to 80; removing room records is intentionally unavailable to protect historical reservations. Larger operational deployments should add a secured database and staff access controls.

## Complete delivery structure

The review ZIP extracts to the following folder. Source and tests are included at the top level, so there is no missing second download.

```text
StayDesk-v1.1/
  StayDesk.html                 Double-click Windows/offline application
  README.md                     This overview and developer instructions
  RELEASE_MANIFEST.json         File sizes and SHA-256 checksums
  index.html                    Vite source entry (developers only)
  package.json
  package-lock.json
  vite.config.js
  .gitignore
  .openai/hosting.json           Existing private Site deployment metadata
  dist/index.html               Identical compiled application
  src/
    main.jsx                    Navigation, application shell, state coordination
    model.js                    Availability, business rules, seed data, reports, validation
    storage.js                  Persistent initialization and guarded transactions
    pages.jsx                   Overview, reservations, calendar, rooms, housekeeping, reports, settings
    drawers.jsx                 Guest/room editing and operational actions
    context.jsx                 Shared UI helpers, translations, error messages
    export.js                   Local native XLSX and UTF-8 CSV exports
    style.css                   Existing responsive design and small usability adjustments
  tests/
    model.test.js               Original booking and operational regression tests
    workflows.test.js           Availability, turnover, room history, billing, report invariants
    storage.test.js             Persistence, stale-write, corruption, and quota-failure tests
    browser.e2e.mjs              Reproducible English/Chinese UI, exports, mobile, and cross-tab checks
  scripts/
    package-release.mjs         Builds the complete review ZIP and checksum manifest
  docs/
    USER_GUIDE.md               Step-by-step guide with actual application screenshots
    VALIDATION.md               Final test evidence and limits
    screenshots/               Ten screenshots referenced by the user guide
```

The package deliberately excludes `node_modules`, `.git`, test-generated guest backups, temporary browser profiles, and credentials. It contains fictional sample data in source code only. The Site project ID is deployment metadata, not an access credential. The separate `.zip.sha256` file verifies the whole archive; the manifest verifies files within it.

## Developer instructions (optional)

End users do **not** need these commands. Developers changing the source need Node.js 20.19+ or a current LTS version. Run commands from the extracted project folder. `npm ci` downloads the libraries pinned by the lockfile; the delivered HTML itself does not need them.

```powershell
npm ci
npm test
npm run build
npm run test:browser
npm run package
```

**Success:** 27 model/storage tests and 21 browser scenarios pass, `dist/index.html` is generated, and the complete archive appears at `release/StayDesk-v1.1-review.zip`.

The browser suite defaults to installed Microsoft Edge in headless mode, with a new isolated context, fictional data, and no access to your normal browser profile. No Playwright browser download is needed when Edge is installed. To use installed Chrome instead:

```powershell
$env:STAYDESK_BROWSER = 'chrome'
npm run test:browser
```

To regenerate the actual screenshots in the guide:

```powershell
$env:SCREENSHOTS = '1'
npm run test:browser
```

The suite normally opens `dist/index.html` via `file://`, the same launch model as the Windows app. `STAYDESK_TEST_URL` optionally targets a different test build; use only a disposable test origin. Test exports and results are written under ignored `.qa/`. `STAYDESK_TEST_OUTPUT` can override that location. The browser suite does not submit anything to AgentGit.

For local development with live reload:

```powershell
npm run dev -- --port 5184
```

**Success:** Vite prints `http://127.0.0.1:5184/`. This server is for development only; ordinary users open `StayDesk.html`.

## Compatibility and upgrade notes

- The browser storage key and backup version remain `staydesk.data.v1` / version 1. Valid 1.0 records can be loaded without clearing them.
- New optional `checkedOutOn` values distinguish actual checkout from minimum billed nights. Historical 1.0 records without that field retain their recorded departure; the app does not invent an earlier checkout.
- New optional `createdOn` values protect historical capacity when adding rooms. Rooms without that field are treated as existing for all historical dates.
- Do not reset sample data to upgrade. Export a backup before moving the offline file, switching browser profiles, or clearing site data.
- The production build bundles React, Lucide icons, ExcelJS, CSS, and application logic into one HTML file. `package-lock.json` pins the developer dependencies, including Vite, Playwright, and the ZIP packager.
