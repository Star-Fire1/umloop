# Backend integration contract

This file describes the API that the current frontend expects. These endpoints are **proposed**, not implemented by this repository. Agree on the route names and JSON response shapes with the backend team before connecting a real service. The only frontend network code is in `src/lib/api/http.ts` and `src/lib/api/marketplace.ts`.

## Configuration and security

Set `NEXT_PUBLIC_DATA_SOURCE=api` and `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. `NEXT_PUBLIC_` variables are visible in the browser; never put API tokens or private keys there.

The API client sends cookies with `credentials: "include"`. The backend must set secure, HTTP-only session cookies, apply CSRF protection to state-changing requests, use HTTPS, and configure CORS for the frontend origin if they are on separate domains. Return `401` for signed-out users and `403` for forbidden operations. A `409` conflict is useful when a listing has just been reserved or a duplicate request already exists. API failures show an error and do not cause the frontend to mark a mutation as successful.

Client-side email checks are for user feedback only. The backend must verify ownership of the account and confirm that the verified email ends in `@siswa.um.edu.my`.

## Fields

There are two different kinds of category:

- `category`: UI item category, currently `Books`, `Tech`, `Fashion`, or `Dorm`.
- `reuse_category`: measurement category, one of `Exchange`, `Donation`, `Affordable Resale`, `Recyclable`. For current frontend forms, donations map to `Donation` and sales to `Affordable Resale`. The other two classifications can be added without changing the underlying status model.

### Listing

The API response should provide at least the following fields (these are the TypeScript names currently used):

```json
{
    "id": "123",
    "title": "Scientific calculator",
    "price": 28,
    "type": "sell",
    "category": "Tech",
    "reuse_category": "Affordable Resale",
    "status": "Available",
    "is_test": false,
    "is_paused": false,
    "owner_email": "owner@siswa.um.edu.my",
    "owner": false,
    "condition": "Good",
    "image": "https://example.org/images/calculator.jpg",
    "images": ["https://example.org/images/calculator.jpg"],
    "seller": "Verified UM student",
    "location": "Central Library",
    "description": "Working scientific calculator",
    "tagline": "Ready for another semester"
}
```

`owner` is a boolean calculated for the **signed-in viewer**, not a property that clients can claim to own. Never expose `owner_email` in a public listing API if it must remain private. In that case, return `owner` and keep owner email checks entirely on the server; the optional `owner_email` field exists for local mock tests only. `is_paused` is an optional visibility flag used by the original Pause/Resume buttons; it is independent of the four defined statuses. Do not use a fifth status of `Paused`.

Listing status rules:

| Status | Meaning |
| --- | --- |
| `Available` | New listing; can receive requests |
| `Reserved` | Owner accepted a request; cannot receive new requests |
| `Completed` | Both parties confirmed offline handover |
| `Removed` | Owner withdrew a listing before handover |

A cancelled or failed handover may reset a reserved listing to `Available` according to backend rules. A removed listing is not equivalent to a paused listing. Public browse results should return only `Available` items not marked `is_paused`.

### Request

```json
{
    "id": "request-123",
    "listingId": "123",
    "person": "Item owner",
    "requester_email": "buyer@siswa.um.edu.my",
    "message": "Can I collect it at the library?",
    "date": "Tomorrow, 2:00 PM",
    "pickup_at": "2026-10-26T14:00:00+08:00",
    "location": "Central Library",
    "request_status": "Pending",
    "is_test": false,
    "confirmed_by_requester": false,
    "confirmed_by_owner": false
}
```

The UI currently uses camelCase `listingId` and human-readable `date`. The request API sends `listing_id` and `pickup_at` (ISO 8601 with Malaysia timezone, or `null` if the time will be discussed). These are **adapter-specific mappings**. Agree on a canonical response format and normalise it in the API adapter. Do not expose `requester_email` to unrelated users. The frontend's in-memory mock stores it only for validation. The backend must derive the requester from the authenticated session, not from a posted email value.

| Request status | Trigger |
| --- | --- |
| `Pending` | A verified student submits a request |
| `Accepted` | Owner accepts; listing becomes `Reserved` in the same transaction |
| `Rejected` | Owner declines |
| `Cancelled` | Requester cancels |
| `Completed` | Both sides confirm the handover; listing becomes `Completed` |

Do not mark a listing or request `Completed` after a single confirmation. Store each party's confirmation and make completion atomic when the second confirmation arrives. If an accepted request fails or gets cancelled, the backend can release the listing to `Available`. This must happen as a server transaction.

## Proposed API routes

All routes below are appended to `NEXT_PUBLIC_API_BASE_URL`.

| Operation | Method and path | Expected response |
| --- | --- | --- |
| Request email code | `POST /auth/otp/request` | `204` |
| Verify email code | `POST /auth/otp/verify` | Verified `Profile` JSON |
| Log out | `POST /auth/logout` | `204` |
| Read/update account | `GET/PATCH /me` | `Profile` JSON |
| List available listings | `GET /listings` | `Listing[]` |
| Create listing | `POST /listings` | Created `Listing` |
| Edit/pause listing | `PATCH /listings/:id` | Updated `Listing`
| Withdraw listing | `POST /listings/:id/withdraw` | Listing with `Removed` status | |
| Reset failed handover | `POST /listings/:id/reset-reservation` | Updated `Listing` |
| Upload listing photo | `POST /uploads/listing-images` | `{ "url": "..." }` |
| My requests | `GET /requests/mine` | `PickupRequest[]` |
| Request item | `POST /requests` | Created `PickupRequest` |
| Accept request | `POST /requests/:id/accept` | `{ "listing": ..., "request": ... }` |
| Reject request | `POST /requests/:id/reject` | Updated `PickupRequest` |
| Cancel request | `POST /requests/:id/cancel` | `{ "listing": ..., "request": ... }` |
| Confirm handover | `POST /requests/:id/confirm-handover` | `{ "listing": ..., "request": ... }` |
| Saved listing IDs | `GET /me/saved` | `string[]` |
| Save / unsave | `POST/DELETE /me/saved/:id` | `204` |
| Chats | `GET /threads` | `Thread[]` |
| Send chat message | `POST /threads/:id/messages` | Updated `Thread` |
| Mark chat read | `POST /threads/:id/read` | `204` |
| Wanted listings | `GET /wanted` | `Wanted[]` |
| Create wanted post | `POST /wanted` | Created `Wanted` |
| Offer item on wanted post | `POST /wanted/:id/offers` | Created/updated `Thread` |
| Reuse totals | `GET /metrics/reuse` | Counts by reuse category |

Uploaded photos are sent as an `images` array of URLs, with `image` holding the first URL for list cards.

The create-listing request intentionally omits `status`, `is_test`, `owner_email` and `owner`. The create-request body sends `listing_id`, `message`, `pickup_at`, and `pickup_location`, but not `request_status` or requester identity. The backend must set default statuses and testing flags itself. Public production requests must not be allowed to set `is_test: false` to manipulate metrics.

### Account JSON

`GET /me`, `PATCH /me`, and successful OTP verification should return:

```json
{
    "name": "UM student",
    "email": "student@siswa.um.edu.my",
    "faculty": "Faculty of Science",
    "year": "Year 2",
    "pickup": "Central Library",
    "verified": true,
    "loggedIn": true
}
```

The profile and thread screens use these names. If the backend has snake_case models, map them inside `src/lib/api/marketplace.ts` so components do not have to know database naming.

## Required server-side transaction tests

1. Reject posting and requesting for unsigned, unverified or non-UM accounts.
2. Reject requests for `Reserved`, `Completed`, `Removed`, or paused items.
3. Reject an owner's request for their own listing.
4. Reject two simultaneous `Pending` requests for the same listing by the same user. Add a database-level uniqueness rule or transaction lock so racing requests cannot bypass checks.
5. When an owner accepts one `Pending` request, atomically mark it `Accepted` and its listing `Reserved`. A second acceptance must fail.
6. Keep a listing `Reserved` after the first handover confirmation. Mark both records `Completed` only after the second party confirms.
7. If a reserved handover fails or is cancelled, restore `Available` only under permitted transitions; do not revive a `Removed` listing by accident.
8. Count reuse using **only** `listings.status = 'Completed' AND listings.is_test = false`, grouped by `reuse_category`. Exclude test accounts and flags as agreed in `KAN-31`. A completed request alone does not make an item count twice.

Use the server's current record version, not client-provided status, to decide transitions. Avoid trusting local storage, browser flags, or user-supplied `owner_email`.

## Frontend boundaries

- `src/lib/api/http.ts`: credentials, JSON, HTTP errors.
- `src/lib/api/marketplace.ts`: endpoint names, request and response mapping, image uploads.
- `src/lib/domain/marketplace.ts`: readable client-side eligibility rules and a pure reuse-count helper.
- `src/lib/store.tsx`: renders server results after successful mutations. Mock mode uses local data; API mode uses the backend.
- `src/mocks/fixtures.ts`: sample data only, always `is_test: true`.

Some screens still depend on fields from the current mock (`person`, `seller`, display labels, etc.). Preserve those fields in API responses or map them centrally. Chat, notifications, account controls, image uploads and the two-party handover must be tested end to end once endpoints exist. No backend was available at handoff, so none of these calls could be tested against a live service.
