# UMLoop frontend QA

## Pages and design

- [ ] Check mobile widths 320, 402 and 430 px; then a desktop width of 1440 px.
- [ ] Confirm the page layout, fonts, colours, icons and image placement match the prior frontend.
- [ ] Check home search sends its text to `/explore?q=...` and fills the Explore search box.
- [ ] Check all 30 Next.js pages load by their own routes, without `[[...slug]]`.
- [ ] Check item detail, listing edit, chat and request URLs with a real dynamic ID.
- [ ] Unknown URLs display the Next.js 404 page.
- [ ] No phone status bar or fake gesture bar appears.

## Mock mode

- [ ] Browse as guest; posting and requesting must fail with a sign-in message.
- [ ] Verify an `@siswa.um.edu.my` address with sample code `248610`.
- [ ] Post and edit a listing. New listings must be `Available` and `is_test: true`.
- [ ] Send a request for an available listing. Its status must be `Pending`.
- [ ] Confirm another request for the same item from the same user is blocked while `Pending`.
- [ ] Confirm the sample reserved lamp cannot accept another request.
- [ ] Confirm a listing owner cannot request their own item.
- [ ] Confirming the seeded accepted handover can complete it because the owner already confirmed in the sample data.
- [ ] Test the `acceptRequest` and two-party completion domain unit tests with `npm test`.
- [ ] Mock completed records must not increase the production reuse counter.

## API mode (after backend handoff)

- [ ] Verify CORS, cookie session, CSRF protection, HTTPS and login/logout behaviour.
- [ ] GET `/me`, `/listings`, `/wanted`, `/requests/mine`, `/me/saved`, and `/threads` return expected field names.
- [ ] OTP verification must be handled by the server. Never allow a hardcoded sample code in API mode.
- [ ] Item photos upload and return usable URLs; failures must not create listings.
- [ ] A rejected POST/PATCH must not update the UI as though it succeeded.
- [ ] A second requester receives `409` when an item is reserved in another session.
- [ ] Two simultaneous requests for the same listing and requester are prevented by the backend.
- [ ] Owner acceptance changes request to `Accepted` and listing to `Reserved` atomically.
- [ ] Confirmation from just one side must not finish a handover.
- [ ] Cancellation/reset restores availability according to the backend's rules.
- [ ] The server, not the client, sets `is_test`; the measurement excludes all test records.
- [ ] Verify Exchange, Donation, Affordable Resale and Recyclable totals against backend records.
- [ ] Recheck filters, chats, saved items, post creation, edit ownership and account preferences after integration.

Run `npm run check`, `npm test`, `npm run typecheck`, and `npm run build` before a release.
