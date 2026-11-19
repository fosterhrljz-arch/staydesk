# StayDesk 1.1 — final validation record

Validation date: November 15, 2026. This release updates the existing StayDesk project; it does not replace the design or add a separate application.

## Result

- **27/27 model and storage tests passed.**
- **21/21 browser scenarios passed in Microsoft Edge.**
- **21/21 browser scenarios passed in Google Chrome.**
- Production Vite build passed. The application is a self-contained HTML file.
- English and Chinese workflows, persistence, backups, native Excel and UTF-8 CSV exports, desktop and narrow-screen navigation passed.
- No application console errors or uncaught browser exceptions were observed in the passing runs.

## Environment and evidence

- Windows; Node.js 24.16.0; installed Edge and Chrome, headless through Playwright.
- Desktop viewport: **1536 × 1024**. Narrow viewport: **390 × 844**.
- The browser suite opened the compiled app using `file://`, matching the terminal-free Windows launch model.
- Each run used an isolated browser context, a fixed fictional sample date, and a separate output directory. No personal browser profile or live hotel data was used.
- Browser plugin not available in this session; regular Playwright provided repeatable local regression checks. The earlier in-app localhost preview connection was unreliable, so validation used the actual offline build.
- Ten real screenshots are included in [the user guide](USER_GUIDE.md) and `docs/screenshots/`. They show the rendered application, including intermediate workflow states. Their counts can differ after test transactions; the opening English overview shows the unchanged sample baseline.

| Required browser check | Result | Evidence |
| --- | --- | --- |
| Correct page identity | Pass | StayDesk page title and local compiled application URL |
| Meaningful content | Pass | Overview heading, five metrics, room snapshot |
| No framework error overlay | Pass | Explicit overlay check and rendered screenshots |
| Console/runtime health | Pass | No captured application errors in either final run |
| Visual evidence | Pass | English/Chinese, calendar, drawer, payments, rooms, housekeeping, reports, settings, mobile screenshots |
| Actual interaction | Pass | Transactions asserted against persisted records and visible status changes |

## Issues corrected

1. **Availability mixed physical readiness with sellable inventory.** A clean, vacant room with a confirmed booking was counted as available. The new shared availability calculation separates these values and matches calendar room-night assignments. Baseline sample: 5 vacant/clean, 5 confirmed rooms reserved tonight, 8 bookable, 2 ready immediately, 6 needing turnover.
2. **Navigation retained the previous page's scroll offset.** Main section navigation and hash changes now reset the new view to the top. Rooms and Housekeeping no longer retain each other's filter state.
3. **Same-day turnover bookings were rejected.** Due-out rooms can be booked for tonight; check-in still requires actual checkout and clean status.
4. **Historical room segments were compared with current physical occupants.** A moved guest's later edit no longer conflicts with the next guest occupying the old room when their room-night intervals do not overlap.
5. **Same-day checkout retained a minimum billing night as an inventory hold.** New checkouts record actual release separately. Minimum charges remain in revenue, while the room can be reserved again and cannot be checked into until clean.
6. **Payment defaults used the early-checkout amount for normal in-house payments.** Normal payment entry now suggests the full-stay balance; the separately labelled checkout settlement action suggests the adjusted payment/refund.
7. **Date rollback and historical capacity could distort reports.** The business date cannot move backward, and newly added rooms affect capacity from their creation date.
8. **Initial sample records were not persisted until an edit.** First-run state is saved immediately. Failed storage writes leave committed records intact; stale writes and stale drawer edits are blocked.
9. **Backup validation omitted several consistency checks.** Restores now reject duplicate room numbers, invalid segments, overlapping assignments, duplicate current occupants, invalid payment ledgers, and incompatible active room capacity/maintenance states.
10. **The initial ZIP omitted source and tests.** The review archive now contains the complete source, locked dependencies, tests, packaging script, screenshot guide, validation record, compiled app, and file manifest.

## Browser scenarios

The included `tests/browser.e2e.mjs` verifies:

1. Offline page identity, meaningful content, no framework overlay.
2. Exact baseline availability values and labels.
3. Calendar conflicts and due-out room booking availability.
4. Scroll-to-top across all main sections.
5. Reservation creation and atomic rejection of overlapping dates.
6. Guest check-in and persisted status.
7. Room move, departure extension, and old-room cleaning status.
8. Full-stay payment, early-checkout refund, and separate settlement action.
9. Same-day checkout, released inventory, retained charge.
10. Dirty → cleaning → inspection → clean transitions.
11. Maintenance restriction on an already-reserved room.
12. Dirty-room check-in rejection, cancellation, refund.
13. English Excel/CSV values compared with computed daily reports.
14. Backup export and unchanged records after reload.
15. Backup restoration after a subsequent setting change.
16. Chinese navigation, availability terminology, and room types.
17. Chinese reservation → check-in → payment → checkout → housekeeping workflow.
18. Chinese Excel/CSV headings and persistent language selection.
19. Mobile layout, menu navigation, reservation drawer, and scroll reset.
20. Cross-tab updates close a stale drawer and retain the latest data.
21. No application console or runtime errors across the run.

The model tests cover additional history-preservation, overdue guest, late-checkout overlap, legacy backup, refund, schema, report-capacity, and storage-failure cases that are more precisely exercised without a browser.

## Reproduce

```powershell
npm ci
npm test
npm run build
npm run test:browser
$env:STAYDESK_BROWSER = 'chrome'
npm run test:browser
npm run package
```

Test results and downloaded files go under ignored `.qa/`. Set `STAYDESK_TEST_OUTPUT` to keep separate runs. Set `SCREENSHOTS=1` when intentionally regenerating the documentation screenshots. `npm ci --dry-run --offline --ignore-scripts --no-audit --no-fund` also verified that the source manifest and lockfile agree using the available dependency cache.

## Remaining limits

- The app is designed for a single browser/workstation, with defensive handling of same-origin tabs. It is not a shared database or a multi-device system.
- Browser storage is not encrypted or a backup service. Clearing browser data or moving the offline file can isolate or remove records. Keep JSON backups.
- No OTA synchronization, real payment processing, staff roles, tax accounting, or automatic night audit is implemented.
- Historical 1.0 checkouts without an actual checkout date retain their recorded room-night intervals; the upgrade does not infer unrecorded history. Such a held night is never advertised as immediately available.
- The actual signed-in hosted session was not used for destructive workflow tests. Private deployment is verified through the hosting service; functional tests use the identical compiled build with fictional data.
- Desktop and 390px layouts were checked in Edge and Chrome. Safari, Firefox, touch hardware, and simultaneous multi-device operations were not verified.
- This record demonstrates the tested first-version workflow; it is not a claim of production certification. No AgentGit submission has been performed.
