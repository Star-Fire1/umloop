import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
// Check that each expected App Router page exists.
const routes = [
    "", "login", "verify", "onboarding", "home", "explore", "filter", "wishlist",
    "wanted", "wanted/new", "offer/[id]", "item/[id]", "request-item/[id]",
    "request-donation/[id]", "request/[id]", "sell", "sell/success", "sell/edit/[id]",
    "activity", "inbox", "chat/[id]", "student/[name]", "profile", "profile/edit",
    "profile/appearance", "profile/notifications", "profile/privacy", "profile/impact",
    "profile/settings", "help"
];
const files = [
    "package.json", "next.config.ts", "tsconfig.json", ".env.example",
    "src/app/layout.tsx", "src/app/globals.css", "src/app/not-found.tsx",
    "src/components/ui/MarketplaceUI.tsx", "src/lib/store.tsx",
    "src/lib/api/http.ts", "src/lib/api/marketplace.ts",
    "src/lib/domain/marketplace.ts", "src/types/marketplace.ts", "src/mocks/fixtures.ts",
    "README.md", "API_HANDOFF.md", "QA_CHECKLIST.md",
    ...routes.map(route => join("src/app", route, "page.tsx"))
];
const images = [
    "campus.jpg", "books.jpg", "books-detail.jpg", "lamp.jpg", "lamp-detail.jpg",
    "calculator.jpg", "ikea-lamp.jpg", "backpack.jpg", "desk.jpg"
];
const missing = [...files, ...images.map(name => `public/images/${name}`)]
    .filter(file => !existsSync(join(root, file)));
if (existsSync(join(root, "src/app/[[...slug]]"))) {
    missing.push("Unexpected catch-all route");
}
for (const file of missing) console.error(`Project check: ${file}`);
if (missing.length) process.exit(1);

const config = readFileSync(join(root, "tsconfig.json"), "utf8");
if (!config.includes('"./src/*"')) {
    console.error("The @/ import alias must point to src/.");
    process.exit(1);
}
console.log(`Found ${routes.length} App Router pages and ${images.length} image assets.`);
