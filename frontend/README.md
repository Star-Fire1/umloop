# UMLoop frontend

Next.js 15 App Router, React 19, TypeScript and CSS. The frontend keeps the existing UMLoop mobile and desktop design. Pages use normal file-based routes. The UI, business rules and API calls live in separate folders.

**Frontend only:** The backend, database, UM email delivery and user sessions are managed by a separate team. Local development uses sample records so developers can run the design before the API is ready. Production builds use API mode unless mock mode is explicitly requested. It must not be presented as a live marketplace.

## Start

Install Node.js 22 or later and run:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Checks:

```bash
npm run check
npm test
npm run typecheck
npm run build
```

`npm test` uses Node.js's TypeScript type-stripping support. The first two checks work without installing project dependencies. Type checking and building need `npm ci` first.

## Backend setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_DATA_SOURCE=api`.
3. Set `NEXT_PUBLIC_API_BASE_URL` to the backend base URL (including its version prefix, if any).
4. Make sure the backend exposes the contract in `API_HANDOFF.md`, or update `src/lib/api/marketplace.ts` to match the agreed endpoints.
5. Run the integration checks in `QA_CHECKLIST.md` before deployment.

API mode sends requests with `credentials: "include"`, so the backend must configure sessions, CSRF protection and CORS as appropriate. Never place API secrets in a `NEXT_PUBLIC_` variable. Account verification must be done by the backend; the frontend only checks the email format before requesting verification.

## Layout of the project

```text
public/
    images/                   Listing and campus images
src/
    app/                      File-based routes and shared layout
        page.tsx              Welcome (/)
        home/page.tsx         Home (/home)
        explore/page.tsx      Explore (/explore)
        item/[id]/page.tsx    Listing details
        profile/              Account routes
        request/[id]/         Request tracking
        ...                   Other pages (one route per page.tsx)
    components/ui/            Shared visual components
    features/
        auth/                 Login, verification, onboarding
        browse/               Home, explore, item and wishlist screens
        trading/              Listing, requests, chats and activity
        account/              Profile, preferences and help
    lib/
        api/                  Fetch client and API endpoints
        domain/               Status rules, request validation, metrics
        format.ts             Display helpers
        store.tsx             State provider, local mock/API updates
    mocks/                    Sample records (always marked is_test)
    types/                    Frontend and API data types
scripts/                     Source checks
tests/                       Business rule tests
API_HANDOFF.md                Proposed backend contract
QA_CHECKLIST.md               Frontend and API integration checks
```

Shared pages render the original screen components. The catch-all `[[...slug]]` dispatcher has been removed. The `app` directory owns routing; `features` owns screen code. Styling remains in `src/app/globals.css`.

## Available pages

| Route | Screen |
| --- | --- |
| `/` | Welcome |
| `/login`, `/verify`, `/onboarding` | Student account flow |
| `/home`, `/explore`, `/filter` | Browse and filter |
| `/item/[id]`, `/wishlist` | Listing and saved items |
| `/request-item/[id]`, `/request-donation/[id]` | Submit a request |
| `/request/[id]`, `/activity` | Request tracking and listings |
| `/sell`, `/sell/edit/[id]`, `/sell/success` | Create and manage listings |
| `/wanted`, `/wanted/new`, `/offer/[id]` | Community wanted requests |
| `/inbox`, `/chat/[id]` | Chats |
| `/profile`, `/profile/edit`, `/profile/settings` | Account |
| `/profile/appearance`, `/profile/notifications`, `/profile/privacy`, `/profile/impact` | Preferences and impact |
| `/student/[name]`, `/help` | Public student profile and help |

## Working with mock data

`NEXT_PUBLIC_DATA_SOURCE=mock` is the local development default. Production defaults to API mode. Mock mode stores sample changes in the browser. The email is `24078302@siswa.um.edu.my`; the sample OTP is `248610`. Sign in before posting or requesting an item. The sample lamp has an accepted request and is already `Reserved`, so it cannot receive a new request. Other sample listings remain available.

Mock listings and requests have `is_test: true`. They do not count towards completed reuse measurements. Local drafts, filters, and appearance settings can remain browser-only. This is not a real login system and does not simulate simultaneous buyers across browsers.

## Backend boundaries

The backend must decide whether a user is verified, owns a listing, may send a request, and may change a status. The frontend waits for server success before changing saved items, listings and requests in API mode. Do not rely on the client-side checks as access control. The full transaction rules, statuses, fields and endpoint shapes are in `API_HANDOFF.md`.

The project does not include a backend, push notifications, real payment handling or a live image service. Image uploads in API mode go to the backend's `/uploads/listing-images` endpoint before saving a listing. For the API to work, that endpoint and all other agreed routes must be implemented by the backend team.
