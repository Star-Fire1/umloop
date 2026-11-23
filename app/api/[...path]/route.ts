// File: app/api/[...path]/route.ts
// Production REST API using Firebase Admin SDK for atomic buyer receipt confirmation & global reuse counter

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../backend/firebaseAdmin";

export interface Profile {
  uid?: string;
  name: string;
  email: string;
  faculty: string;
  year: string;
  pickup: string;
  verified: boolean;
  loggedIn: boolean;
}

interface StoredListing {
  id: string;
  title: string;
  price: number;
  type: "sell" | "donate" | "exchange";
  category: "Books" | "Tech" | "Fashion" | "Dorm";
  reuse_category: "Exchange" | "Donation" | "Affordable Resale" | "Recyclable";
  status: "Available" | "Reserved" | "Completed" | "Removed";
  is_test: boolean;
  is_paused: boolean;
  is_boosted: boolean;
  boosted_until: string | null;
  owner_uid?: string;
  owner_email: string;
  condition: string;
  image: string;
  images: string[];
  seller: string;
  location: string;
  description: string;
  tagline: string;
  created_at: string;
}

export interface PickupRequest {
  id: string;
  listingId?: string;
  listing_id?: string;
  listing_title?: string;
  owner_uid?: string;
  owner_email: string;
  person: string;
  requester_uid?: string;
  requester_email: string;
  message: string;
  date: string;
  pickup_at: string | null;
  location: string;
  request_status: "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";
  is_test: boolean;
  confirmed_by_requester: boolean;
  confirmed_by_owner: boolean;
}

interface StoredMessage {
  id: string;
  senderEmail: string;
  text: string;
  time: string;
}

interface StoredThread {
  id: string;
  listingId: string;
  participants: string[];
  participantNames: Record<string, string>;
  unreadBy: Record<string, number>;
  messages: StoredMessage[];
}

interface StoredWanted {
  id: string;
  title: string;
  category: string;
  budget: number;
  donation: boolean;
  faculty: string;
  year: string;
  posted: string;
  location: string;
  description: string;
  requester: string;
  owner_email: string;
}

export interface BoostTransaction {
  id: string;
  listingId: string;
  userEmail: string;
  amount: number;
  currency: "MYR";
  paymentMethod: "QR_CODE";
  status: "Completed";
  createdAt: string;
}

const ALLOWED_CATEGORIES = ["Books", "Tech", "Fashion", "Dorm"] as const;
const ALLOWED_REUSE_CATEGORIES = [
  "Exchange",
  "Donation",
  "Affordable Resale",
  "Recyclable",
] as const;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.GEMINI_API_KEY ||
    "umloop-hmac-session-signing-secret-v1"
  );
}

function isValidUmEmail(email: string): boolean {
  return /^[^@\s]+@siswa\.um\.edu\.my$/i.test(email.trim());
}

function getAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowlist = new Set([
    "https://umloop.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    ...envOrigins,
  ]);

  if (allowlist.has(origin) || /^https:\/\/umloop-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return origin;
  }
  return null;
}

function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

function errorResponse(req: NextRequest, message: string, status: number): NextResponse {
  return withCors(req, NextResponse.json({ message, error: message }, { status }));
}

function signSessionToken(email: string, sessionVersion: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      email: email.toLowerCase(),
      v: sessionVersion,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
    "utf-8"
  ).toString("base64url");

  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${sig}`;
}

function verifySessionToken(
  token: string
): { email: string; v: number; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!parsed.email || !isValidUmEmail(parsed.email) || Date.now() > Number(parsed.exp)) {
      return null;
    }
    return { email: parsed.email.toLowerCase(), v: Number(parsed.v || 1), exp: parsed.exp };
  } catch {
    return null;
  }
}

function setSessionCookie(req: NextRequest, res: NextResponse, token: string) {
  const isHttps =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  res.cookies.set("umloop_session", token, {
    httpOnly: true,
    path: "/",
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60,
  });
}

// Resolve authenticated caller from either Firebase ID Token (Bearer) or signed HTTP-only session cookie
async function getAuthenticatedProfile(req: NextRequest): Promise<Profile | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7).trim();
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const email = String(decoded.email || "").toLowerCase();
      if (!isValidUmEmail(email)) return null;

      const snap = await adminDb.collection("profiles").doc(email).get();
      const data = snap.exists ? snap.data() || {} : {};
      return {
        uid: decoded.uid,
        name: String(data.name || decoded.name || email.split("@")[0]),
        email,
        faculty: String(data.faculty || "Faculty of Computer Science & IT"),
        year: String(data.year || "Year 2"),
        pickup: String(data.pickup || "Central Library"),
        verified: true,
        loggedIn: true,
      };
    } catch {
      return null;
    }
  }

  const cookieVal = req.cookies.get("umloop_session")?.value;
  if (!cookieVal) return null;

  const verifiedToken = verifySessionToken(cookieVal);
  if (!verifiedToken) return null;

  const snap = await adminDb.collection("profiles").doc(verifiedToken.email).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  const currentVersion = Number(data.sessionVersion || 1);
  if (currentVersion !== verifiedToken.v || data.loggedIn === false) {
    return null;
  }

  let resolvedUid: string | undefined = data.uid;
  if (!resolvedUid) {
    try {
      const userRecord = await adminAuth.getUserByEmail(verifiedToken.email);
      resolvedUid = userRecord.uid;
    } catch {
      resolvedUid = undefined;
    }
  }

  return {
    uid: resolvedUid,
    name: String(data.name || verifiedToken.email.split("@")[0]),
    email: verifiedToken.email,
    faculty: String(data.faculty || "Faculty of Computer Science & IT"),
    year: String(data.year || "Year 2"),
    pickup: String(data.pickup || "Central Library"),
    verified: Boolean(data.verified),
    loggedIn: true,
  };
}

async function dispatchOtpEmail(email: string, code: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.OTP_FROM_EMAIL || "UMLoop <onboarding@resend.dev>",
        to: [email],
        subject: "Your UMLoop Verification Code",
        text: `Your UMLoop student verification code is ${code}. It expires in 10 minutes.`,
      }),
    });
    return resp.ok;
  }

  console.info(`[UMLoop OTP] Verification code for ${email}: ${code}`);
  return true;
}

// Normalize both new REST listings and legacy Firestore records into full frontend shape without exposing owner_email
function toPublicListing(
  listing: Partial<StoredListing> & { id: string; owner_uid?: string },
  viewerEmail: string | null
) {
  const rawCat = String(listing.category || "Books");
  const isUiCategory = (ALLOWED_CATEGORIES as readonly string[]).includes(rawCat);
  const uiCategory = isUiCategory ? rawCat : "Tech";
  const reuseCategory =
    listing.reuse_category ||
    ((ALLOWED_REUSE_CATEGORIES as readonly string[]).includes(rawCat)
      ? rawCat
      : "Affordable Resale");

  const defaultImg =
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80";
  const images =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : [listing.image || defaultImg];

  const ownerEmail = String(listing.owner_email || "");

  return {
    id: listing.id,
    title: String(listing.title || "Campus Item"),
    price: Number(listing.price ?? 0),
    type:
      listing.type ||
      (reuseCategory === "Donation"
        ? "donate"
        : reuseCategory === "Exchange"
        ? "exchange"
        : "sell"),
    category: uiCategory,
    reuse_category: reuseCategory,
    status: listing.status || "Available",
    is_test: Boolean(listing.is_test),
    is_paused: Boolean(listing.is_paused),
    is_boosted: Boolean(listing.is_boosted),
    owner: Boolean(
      viewerEmail && ownerEmail && ownerEmail.toLowerCase() === viewerEmail.toLowerCase()
    ),
    condition: String(listing.condition || "Good"),
    image: images[0],
    images,
    seller: String(listing.seller || "Verified UM student"),
    location: String(listing.location || "Central Library"),
    description: String(listing.description || "Available for campus handover."),
    tagline: String(listing.tagline || "Ready for another semester"),
  };
}

function toPublicWanted(wanted: StoredWanted) {
  const { owner_email, ...publicFields } = wanted;
  void owner_email;
  return publicFields;
}

function toFrontendThread(thread: StoredThread, viewerEmail: string) {
  const viewerLower = viewerEmail.toLowerCase();
  const otherEmail =
    thread.participants.find((p) => p.toLowerCase() !== viewerLower) || viewerLower;

  return {
    id: thread.id,
    listingId: thread.listingId,
    person: thread.participantNames[otherEmail] || otherEmail.split("@")[0],
    unread: Number(thread.unreadBy[viewerLower] || 0),
    messages: thread.messages.map((m) => ({
      id: m.id,
      text: m.text,
      time: m.time,
      byMe: m.senderEmail.toLowerCase() === viewerLower,
    })),
  };
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

async function handleRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const method = req.method.toUpperCase();
  const routePath = "/" + (path || []).join("/");

  try {
    // =========================================================================
    // 1. AUTHENTICATION & PROFILES
    // =========================================================================
    if (method === "POST" && routePath === "/auth/otp/request") {
      const body = await req.json().catch(() => ({}));
      const email = String(body.email || "").trim().toLowerCase();
      if (!isValidUmEmail(email)) {
        return errorResponse(req, "Only @siswa.um.edu.my student emails are eligible.", 403);
      }

      const otpRef = adminDb.collection("otp_codes").doc(email);
      const existingSnap = await otpRef.get();
      if (existingSnap.exists) {
        const lastSentAt = Number(existingSnap.data()?.lastSentAt || 0);
        if (Date.now() - lastSentAt < OTP_RESEND_COOLDOWN_MS) {
          return errorResponse(
            req,
            "Please wait 60 seconds before requesting another verification code.",
            429
          );
        }
      }

      const code = String(crypto.randomInt(100000, 999999));
      await otpRef.set({
        email,
        code,
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: Date.now(),
        used: false,
      });

      const sent = await dispatchOtpEmail(email, code);
      if (!sent) {
        return errorResponse(req, "Failed to send verification email. Please try again.", 502);
      }

      return withCors(req, new NextResponse(null, { status: 204 }));
    }

    if (method === "POST" && routePath === "/auth/otp/verify") {
      const body = await req.json().catch(() => ({}));
      const email = String(body.email || "").trim().toLowerCase();
      const code = String(body.code || "").trim();

      if (!isValidUmEmail(email)) {
        return errorResponse(req, "Verification failed: Must be a valid @siswa.um.edu.my email.", 403);
      }
      if (!/^\d{6}$/.test(code)) {
        return errorResponse(req, "Please enter a valid 6-digit verification code.", 400);
      }

      const otpRef = adminDb.collection("otp_codes").doc(email);
      const otpSnap = await otpRef.get();
      if (!otpSnap.exists) {
        return errorResponse(req, "No verification code requested for this email.", 400);
      }

      const otpData = otpSnap.data() || {};
      if (otpData.used) {
        return errorResponse(req, "This verification code has already been used.", 400);
      }
      if (Date.now() > Number(otpData.expiresAt || 0)) {
        return errorResponse(req, "Verification code has expired. Please request a new one.", 400);
      }
      const attempts = Number(otpData.attempts || 0);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        return errorResponse(req, "Too many failed attempts. Please request a new code.", 429);
      }

      if (otpData.code !== code) {
        await otpRef.update({ attempts: attempts + 1 });
        return errorResponse(req, "Incorrect verification code.", 401);
      }

      await otpRef.update({ used: true });

      const profileRef = adminDb.collection("profiles").doc(email);
      const profileSnap = await profileRef.get();
      const existing = profileSnap.exists ? profileSnap.data() || {} : {};
      const nextSessionVersion = Number(existing.sessionVersion || 0) + 1;

      const profile: Profile = {
        name: String(body.name || existing.name || email.split("@")[0]),
        email,
        faculty: String(body.faculty || existing.faculty || "Faculty of Computer Science & IT"),
        year: String(body.year || existing.year || "Year 2"),
        pickup: String(body.pickup || existing.pickup || "Central Library"),
        verified: true,
        loggedIn: true,
      };

      await profileRef.set({
        ...profile,
        sessionVersion: nextSessionVersion,
        updatedAt: new Date().toISOString(),
      });

      const token = signSessionToken(email, nextSessionVersion);
      const res = NextResponse.json(profile, { status: 200 });
      setSessionCookie(req, res, token);
      return withCors(req, res);
    }

    if (method === "POST" && routePath === "/auth/logout") {
      const session = await getAuthenticatedProfile(req);
      if (session) {
        const profileRef = adminDb.collection("profiles").doc(session.email);
        const snap = await profileRef.get();
        const nextVersion = Number(snap.data()?.sessionVersion || 1) + 1;
        await profileRef.set(
          { loggedIn: false, sessionVersion: nextVersion },
          { merge: true }
        );
      }

      const res = new NextResponse(null, { status: 204 });
      res.cookies.delete("umloop_session");
      return withCors(req, res);
    }

    const session = await getAuthenticatedProfile(req);

    if (routePath === "/me") {
      if (!session) {
        return errorResponse(req, "Please sign in with your @siswa.um.edu.my account.", 401);
      }
      if (method === "GET") {
        return withCors(req, NextResponse.json(session, { status: 200 }));
      }
      if (method === "PATCH") {
        const body = await req.json().catch(() => ({}));
        const updated: Profile = {
          ...session,
          name: body.name !== undefined ? String(body.name).trim() || session.name : session.name,
          faculty: body.faculty !== undefined ? String(body.faculty).trim() : session.faculty,
          year: body.year !== undefined ? String(body.year).trim() : session.year,
          pickup: body.pickup !== undefined ? String(body.pickup).trim() : session.pickup,
        };
        await adminDb.collection("profiles").doc(session.email).set(
          {
            name: updated.name,
            faculty: updated.faculty,
            year: updated.year,
            pickup: updated.pickup,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return withCors(req, NextResponse.json(updated, { status: 200 }));
      }
    }

    // =========================================================================
    // 2. SAVED LISTINGS
    // =========================================================================
    if (method === "GET" && routePath === "/me/saved") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const snap = await adminDb.collection("saved_items").doc(session.email).get();
      const ids: string[] = snap.exists ? snap.data()?.listingIds || [] : [];
      return withCors(req, NextResponse.json(ids, { status: 200 }));
    }

    if (path.length === 3 && path[0] === "me" && path[1] === "saved") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const listingId = decodeURIComponent(path[2]);
      const savedRef = adminDb.collection("saved_items").doc(session.email);

      if (method === "POST") {
        const listingSnap = await adminDb.collection("listings").doc(listingId).get();
        if (!listingSnap.exists) {
          return errorResponse(req, "Listing not found.", 404);
        }
        await savedRef.set({ listingIds: FieldValue.arrayUnion(listingId) }, { merge: true });
        return withCors(req, new NextResponse(null, { status: 204 }));
      }

      if (method === "DELETE") {
        await savedRef.set({ listingIds: FieldValue.arrayRemove(listingId) }, { merge: true });
        return withCors(req, new NextResponse(null, { status: 204 }));
      }
    }

    // =========================================================================
    // 3. IMAGE UPLOADS
    // =========================================================================
    if (method === "POST" && routePath === "/uploads/listing-images") {
      if (!session) {
        return errorResponse(req, "Please sign in before uploading item photos.", 401);
      }

      const formData = await req.formData().catch(() => null);
      const file = formData?.get("file");
      if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
        return errorResponse(req, "No image file provided in 'file' field.", 400);
      }

      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
        return errorResponse(
          req,
          "Unsupported image format. Only JPEG, PNG, WebP, and GIF are allowed.",
          400
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
        return errorResponse(req, "Image size must be between 1 byte and 2 MB.", 400);
      }

      const ext = file.type.split("/")[1] || "jpg";
      const fileName = `listings/${crypto.randomUUID()}.${ext}`;
      const bucket =
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "um-loop-test-1.firebasestorage.app";

      const uploadResp = await fetch(
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(
          fileName
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: arrayBuffer,
        }
      );

      if (!uploadResp.ok) {
        return errorResponse(
          req,
          "Failed to upload image to cloud storage. Check Firebase Storage permissions.",
          502
        );
      }

      const storageMeta = await uploadResp.json();
      const token = storageMeta.downloadTokens;
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        fileName
      )}?alt=media${token ? `&token=${token}` : ""}`;

      return withCors(req, NextResponse.json({ url: publicUrl }, { status: 200 }));
    }

    // =========================================================================
    // 4. LISTINGS
    // =========================================================================
    if (method === "GET" && routePath === "/listings") {
      const snap = await adminDb.collection("listings").get();
      const viewerEmail = session?.email || null;
      const items: Array<Partial<StoredListing> & { id: string }> = [];

      snap.forEach((docSnap) => {
        const d = docSnap.data() as Partial<StoredListing>;
        const isOwner = Boolean(
          viewerEmail && d.owner_email?.toLowerCase() === viewerEmail.toLowerCase()
        );
        if ((d.status === "Available" && !d.is_paused) || isOwner) {
          items.push({ ...d, id: docSnap.id });
        }
      });

      items.sort((a, b) => Number(Boolean(b.is_boosted)) - Number(Boolean(a.is_boosted)));

      return withCors(
        req,
        NextResponse.json(
          items.map((item) => toPublicListing(item, viewerEmail)),
          { status: 200 }
        )
      );
    }

    if (method === "POST" && routePath === "/listings") {
      if (!session) return errorResponse(req, "Sign-in required to post a listing.", 401);
      if (!session.verified || !isValidUmEmail(session.email)) {
        return errorResponse(req, "Forbidden: Verified @siswa.um.edu.my email required.", 403);
      }

      const body = await req.json().catch(() => ({}));
      const title = String(body.title || "").trim();
      if (!title) return errorResponse(req, "Listing title is required.", 400);

      const type = body.type === "donate" ? "donate" : body.type === "exchange" ? "exchange" : "sell";
      const price = Number(body.price ?? 0);
      if (Number.isNaN(price) || price < 0) {
        return errorResponse(req, "Price must be a non-negative number.", 400);
      }
      if ((type === "donate" || type === "exchange") && price !== 0) {
        return errorResponse(req, "Donations and exchanges must have a price of 0.", 400);
      }

      const category = ALLOWED_CATEGORIES.includes(body.category) ? body.category : "Books";
      const reuseCategory = ALLOWED_REUSE_CATEGORIES.includes(body.reuse_category)
        ? body.reuse_category
        : type === "donate"
        ? "Donation"
        : type === "exchange"
        ? "Exchange"
        : "Affordable Resale";

      const imagesArr: string[] = Array.isArray(body.images)
        ? body.images.filter((u: unknown) => typeof u === "string" && u.trim().length > 0)
        : typeof body.image === "string" && body.image.trim()
        ? [body.image.trim()]
        : [];

      if (imagesArr.length === 0) {
        return errorResponse(req, "At least one valid listing image URL is required.", 400);
      }

      const id = crypto.randomUUID();
      const newListing: StoredListing = {
        id,
        title,
        price,
        type,
        category,
        reuse_category: reuseCategory,
        status: "Available",
        is_test: Boolean(body.is_test ?? false),
        is_paused: false,
        is_boosted: false,
        boosted_until: null,
        owner_uid: session.uid,
        owner_email: session.email,
        condition: String(body.condition || "Good"),
        image: imagesArr[0],
        images: imagesArr,
        seller: session.name || "Verified UM student",
        location: String(body.location || session.pickup || "Central Library"),
        description: String(body.description || ""),
        tagline: String(body.tagline || "Ready for campus handover"),
        created_at: new Date().toISOString(),
      };

      await adminDb.collection("listings").doc(id).set(newListing);
      return withCors(
        req,
        NextResponse.json(toPublicListing(newListing, session.email), { status: 201 })
      );
    }

    if (method === "PATCH" && path.length === 2 && path[0] === "listings") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const listingId = decodeURIComponent(path[1]);
      const listingRef = adminDb.collection("listings").doc(listingId);
      const snap = await listingRef.get();
      if (!snap.exists) return errorResponse(req, "Listing not found.", 404);

      const existing = { ...(snap.data() as StoredListing), id: snap.id };
      if (existing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
        return errorResponse(req, "Forbidden: You can only edit your own listings.", 403);
      }
      if (existing.status === "Completed" || existing.status === "Removed") {
        return errorResponse(req, `Cannot edit a listing with status '${existing.status}'.`, 409);
      }

      const body = await req.json().catch(() => ({}));
      const nextPrice = body.price !== undefined ? Number(body.price) : existing.price;
      if (Number.isNaN(nextPrice) || nextPrice < 0) {
        return errorResponse(req, "Price must be a non-negative number.", 400);
      }

      const nextImages =
        Array.isArray(body.images) && body.images.length > 0 ? body.images : existing.images;

      const updated: StoredListing = {
        ...existing,
        title: body.title !== undefined ? String(body.title).trim() || existing.title : existing.title,
        type: body.type ?? existing.type,
        price: nextPrice,
        category: ALLOWED_CATEGORIES.includes(body.category) ? body.category : existing.category,
        reuse_category: ALLOWED_REUSE_CATEGORIES.includes(body.reuse_category)
          ? body.reuse_category
          : existing.reuse_category,
        condition: body.condition ?? existing.condition,
        image: body.image ?? nextImages[0] ?? existing.image,
        images: nextImages,
        location: body.location ?? existing.location,
        description: body.description ?? existing.description,
        tagline: body.tagline ?? existing.tagline,
        is_paused: typeof body.is_paused === "boolean" ? body.is_paused : existing.is_paused,
      };

      await listingRef.set(updated, { merge: true });
      return withCors(
        req,
        NextResponse.json(toPublicListing(updated, session.email), { status: 200 })
      );
    }

    if (
      method === "POST" &&
      path.length === 3 &&
      path[0] === "listings" &&
      path[2] === "withdraw"
    ) {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const listingId = decodeURIComponent(path[1]);
      const listingRef = adminDb.collection("listings").doc(listingId);

      const updatedListing = await adminDb.runTransaction(async (tx) => {
        const lSnap = await tx.get(listingRef);
        if (!lSnap.exists) throw new Error("NOT_FOUND");
        const listing = { ...(lSnap.data() as StoredListing), id: lSnap.id };
        if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
          throw new Error("FORBIDDEN");
        }
        if (listing.status === "Completed") {
          throw new Error("CONFLICT_COMPLETED");
        }

        const reqSnaps1 = await tx.get(
          adminDb.collection("requests").where("listingId", "==", listingId)
        );
        const reqSnaps2 = await tx.get(
          adminDb.collection("requests").where("listing_id", "==", listingId)
        );

        listing.status = "Removed";
        tx.update(listingRef, { status: "Removed" });

        const seen = new Set<string>();
        for (const rDoc of [...reqSnaps1.docs, ...reqSnaps2.docs]) {
          if (seen.has(rDoc.id)) continue;
          seen.add(rDoc.id);
          const rStatus = rDoc.data().request_status;
          if (rStatus === "Pending" || rStatus === "Accepted") {
            tx.update(rDoc.ref, { request_status: "Cancelled" });
          }
        }

        return listing;
      });

      return withCors(
        req,
        NextResponse.json(toPublicListing(updatedListing, session.email), { status: 200 })
      );
    }

    if (
      method === "POST" &&
      path.length === 3 &&
      path[0] === "listings" &&
      path[2] === "reset-reservation"
    ) {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const listingId = decodeURIComponent(path[1]);
      const listingRef = adminDb.collection("listings").doc(listingId);

      const updatedListing = await adminDb.runTransaction(async (tx) => {
        const lSnap = await tx.get(listingRef);
        if (!lSnap.exists) throw new Error("NOT_FOUND");
        const listing = { ...(lSnap.data() as StoredListing), id: lSnap.id };
        if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
          throw new Error("FORBIDDEN");
        }
        if (listing.status !== "Reserved") {
          throw new Error("CONFLICT_NOT_RESERVED");
        }

        const reqSnaps1 = await tx.get(
          adminDb
            .collection("requests")
            .where("listingId", "==", listingId)
            .where("request_status", "==", "Accepted")
        );
        const reqSnaps2 = await tx.get(
          adminDb
            .collection("requests")
            .where("listing_id", "==", listingId)
            .where("request_status", "==", "Accepted")
        );

        listing.status = "Available";
        tx.update(listingRef, { status: "Available" });

        const seen = new Set<string>();
        for (const rDoc of [...reqSnaps1.docs, ...reqSnaps2.docs]) {
          if (seen.has(rDoc.id)) continue;
          seen.add(rDoc.id);
          tx.update(rDoc.ref, { request_status: "Cancelled" });
        }

        return listing;
      });

      return withCors(
        req,
        NextResponse.json(toPublicListing(updatedListing, session.email), { status: 200 })
      );
    }

    // =========================================================================
    // 5. REQUESTS & BUYER RECEIPT CONFIRMATION (Atomic Admin SDK Transactions)
    // =========================================================================
    if (method === "GET" && routePath === "/requests/mine") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const snap = await adminDb.collection("requests").get();
      const mine: PickupRequest[] = [];
      const userEmail = session.email.toLowerCase();

      snap.forEach((d) => {
        const raw = d.data() as PickupRequest;
        const r: PickupRequest = {
          ...raw,
          id: d.id,
          listingId: raw.listingId || raw.listing_id || "",
        };
        if (
          r.requester_email?.toLowerCase() === userEmail ||
          r.owner_email?.toLowerCase() === userEmail
        ) {
          mine.push(r);
        }
      });

      return withCors(req, NextResponse.json(mine, { status: 200 }));
    }

    if (method === "POST" && routePath === "/requests") {
      if (!session) return errorResponse(req, "Please sign in to request an item.", 401);
      if (!session.verified || !isValidUmEmail(session.email)) {
        return errorResponse(req, "Forbidden: Verified UM student account required.", 403);
      }

      const body = await req.json().catch(() => ({}));
      const listingId = String(body.listing_id || body.listingId || "").trim();
      if (!listingId) return errorResponse(req, "listing_id is required.", 400);

      if (body.pickup_at !== undefined && body.pickup_at !== null) {
        const parsedDate = Date.parse(String(body.pickup_at));
        if (Number.isNaN(parsedDate)) {
          return errorResponse(req, "Invalid pickup_at ISO date format.", 400);
        }
      }

      const lockId = `${listingId}_${session.email.toLowerCase()}`;
      const lockRef = adminDb.collection("request_locks").doc(lockId);
      const listingRef = adminDb.collection("listings").doc(listingId);
      const newReqId = crypto.randomUUID();
      const newReqRef = adminDb.collection("requests").doc(newReqId);

      const createdRequest = await adminDb.runTransaction(async (tx) => {
        const [lSnap, lockSnap] = await Promise.all([tx.get(listingRef), tx.get(lockRef)]);
        if (!lSnap.exists) throw new Error("NOT_FOUND");
        const listing = lSnap.data() as StoredListing;

        if (
          listing.owner_email?.toLowerCase() === session.email.toLowerCase() ||
          (session.uid && listing.owner_uid && listing.owner_uid === session.uid)
        ) {
          throw new Error("SELF_REQUEST");
        }
        if (listing.status !== "Available" || listing.is_paused) {
          throw new Error("UNAVAILABLE");
        }
        if (lockSnap.exists && lockSnap.data()?.active === true) {
          throw new Error("DUPLICATE_REQUEST");
        }

        const reqRecord: PickupRequest = {
          id: newReqId,
          listingId,
          listing_id: listingId,
          listing_title: listing.title,
          owner_uid: listing.owner_uid,
          owner_email: listing.owner_email,
          person: session.name || "Verified UM student",
          requester_uid: session.uid,
          requester_email: session.email,
          message: String(body.message || "Hi, I would like to request this item."),
          date: body.pickup_at
            ? new Date(body.pickup_at).toLocaleString("en-MY")
            : "Time to be discussed",
          pickup_at: body.pickup_at ?? null,
          location: String(body.pickup_location || body.location || listing.location),
          request_status: "Pending",
          is_test: Boolean(body.is_test ?? false),
          confirmed_by_requester: false,
          confirmed_by_owner: false,
        };

        tx.set(newReqRef, reqRecord);
        tx.set(lockRef, { active: true, requestId: newReqId });
        return reqRecord;
      });

      return withCors(req, NextResponse.json(createdRequest, { status: 201 }));
    }

    if (method === "POST" && path.length === 3 && path[0] === "requests") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const reqId = decodeURIComponent(path[1]);
      const action = path[2];
      const reqRef = adminDb.collection("requests").doc(reqId);

      if (action === "accept") {
        const result = await adminDb.runTransaction(async (tx) => {
          const rSnap = await tx.get(reqRef);
          if (!rSnap.exists) throw new Error("NOT_FOUND");
          const reqData = { ...(rSnap.data() as PickupRequest), id: rSnap.id };
          const targetListingId = String(reqData.listingId || reqData.listing_id || "");

          const listingRef = adminDb.collection("listings").doc(targetListingId);
          const lSnap = await tx.get(listingRef);
          if (!lSnap.exists) throw new Error("NOT_FOUND");
          const listingData = { ...(lSnap.data() as StoredListing), id: lSnap.id };

          const isOwner =
            listingData.owner_email?.toLowerCase() === session.email.toLowerCase() ||
            Boolean(session.uid && listingData.owner_uid === session.uid);
          if (!isOwner) throw new Error("FORBIDDEN");

          if (listingData.status !== "Available" || reqData.request_status !== "Pending") {
            throw new Error("CONFLICT");
          }

          reqData.request_status = "Accepted";
          listingData.status = "Reserved";
          tx.update(reqRef, { request_status: "Accepted" });
          tx.update(listingRef, { status: "Reserved" });

          return {
            listing: toPublicListing(listingData, session.email),
            request: reqData,
          };
        });
        return withCors(req, NextResponse.json(result, { status: 200 }));
      }

      if (action === "reject") {
        const updatedReq = await adminDb.runTransaction(async (tx) => {
          const rSnap = await tx.get(reqRef);
          if (!rSnap.exists) throw new Error("NOT_FOUND");
          const reqData = { ...(rSnap.data() as PickupRequest), id: rSnap.id };
          const targetListingId = String(reqData.listingId || reqData.listing_id || "");

          const lSnap = await tx.get(adminDb.collection("listings").doc(targetListingId));
          if (!lSnap.exists) throw new Error("NOT_FOUND");
          const listingData = lSnap.data() as StoredListing;

          const isOwner =
            listingData.owner_email?.toLowerCase() === session.email.toLowerCase() ||
            Boolean(session.uid && listingData.owner_uid === session.uid);
          if (!isOwner) throw new Error("FORBIDDEN");

          if (reqData.request_status !== "Pending") {
            throw new Error("CONFLICT_NOT_PENDING");
          }

          reqData.request_status = "Rejected";
          tx.update(reqRef, { request_status: "Rejected" });
          if (reqData.requester_email) {
            const lockRef = adminDb
              .collection("request_locks")
              .doc(`${targetListingId}_${reqData.requester_email.toLowerCase()}`);
            tx.set(lockRef, { active: false }, { merge: true });
          }
          return reqData;
        });
        return withCors(req, NextResponse.json(updatedReq, { status: 200 }));
      }

      if (action === "cancel") {
        const result = await adminDb.runTransaction(async (tx) => {
          const rSnap = await tx.get(reqRef);
          if (!rSnap.exists) throw new Error("NOT_FOUND");
          const reqData = { ...(rSnap.data() as PickupRequest), id: rSnap.id };
          const targetListingId = String(reqData.listingId || reqData.listing_id || "");

          const listingRef = adminDb.collection("listings").doc(targetListingId);
          const lSnap = await tx.get(listingRef);
          if (!lSnap.exists) throw new Error("NOT_FOUND");
          const listingData = { ...(lSnap.data() as StoredListing), id: lSnap.id };

          const isOwner =
            listingData.owner_email?.toLowerCase() === session.email.toLowerCase() ||
            Boolean(session.uid && listingData.owner_uid === session.uid);
          const isRequester =
            reqData.requester_email?.toLowerCase() === session.email.toLowerCase() ||
            Boolean(session.uid && reqData.requester_uid === session.uid);
          if (!isOwner && !isRequester) throw new Error("FORBIDDEN");

          if (
            reqData.request_status !== "Pending" &&
            reqData.request_status !== "Accepted"
          ) {
            throw new Error("CONFLICT_INVALID_CANCEL");
          }

          const wasAccepted = reqData.request_status === "Accepted";
          reqData.request_status = "Cancelled";
          tx.update(reqRef, { request_status: "Cancelled" });

          if (reqData.requester_email) {
            const lockRef = adminDb
              .collection("request_locks")
              .doc(`${targetListingId}_${reqData.requester_email.toLowerCase()}`);
            tx.set(lockRef, { active: false }, { merge: true });
          }

          if (wasAccepted && listingData.status === "Reserved") {
            listingData.status = "Available";
            tx.update(listingRef, { status: "Available" });
          }

          return {
            listing: toPublicListing(listingData, session.email),
            request: reqData,
          };
        });
        return withCors(req, NextResponse.json(result, { status: 200 }));
      }

      // Buyer Receipt Confirmation & Handover Completion (Atomically increments statistics/global.reuseCount)
      if (action === "confirm-receipt" || action === "confirm-handover") {
        const result = await adminDb.runTransaction(async (tx) => {
          const rSnap = await tx.get(reqRef);
          if (!rSnap.exists) throw new Error("NOT_FOUND");
          const reqData = { ...(rSnap.data() as PickupRequest), id: rSnap.id };
          const targetListingId = String(reqData.listingId || reqData.listing_id || "");

          // Prevent duplicate completion & duplicate counter increments
          if (reqData.request_status === "Completed") {
            throw new Error("ALREADY_COMPLETED");
          }
          if (reqData.request_status !== "Accepted") {
            throw new Error("CONFLICT_HANDOVER");
          }

          const listingRef = adminDb.collection("listings").doc(targetListingId);
          const statsRef = adminDb.collection("statistics").doc("global");
          const [lSnap, statsSnap] = await Promise.all([
            tx.get(listingRef),
            tx.get(statsRef),
          ]);
          if (!lSnap.exists) throw new Error("NOT_FOUND");
          const listingData = { ...(lSnap.data() as StoredListing), id: lSnap.id };

          if (listingData.status !== "Reserved") {
            throw new Error("CONFLICT_HANDOVER");
          }

          // Validate authenticated buyer's UID (and email fallback)
          const isBuyerByUid = Boolean(
            session.uid && reqData.requester_uid && session.uid === reqData.requester_uid
          );
          const isBuyerByEmail = Boolean(
            reqData.requester_email &&
              session.email.toLowerCase() === reqData.requester_email.toLowerCase()
          );
          const isBuyer = isBuyerByUid || isBuyerByEmail;

          const isOwner = Boolean(
            (session.uid && listingData.owner_uid && session.uid === listingData.owner_uid) ||
              (listingData.owner_email &&
                session.email.toLowerCase() === listingData.owner_email.toLowerCase())
          );

          if (action === "confirm-receipt" && !isBuyer) {
            throw new Error("FORBIDDEN_BUYER_ONLY");
          }
          if (!isBuyer && !isOwner) {
            throw new Error("FORBIDDEN");
          }

          if (isOwner) reqData.confirmed_by_owner = true;
          if (isBuyer) reqData.confirmed_by_requester = true;

          // Transition to Completed when buyer confirms receipt (or both parties confirm in two-party mode)
          const shouldComplete =
            action === "confirm-receipt"
              ? isBuyer
              : Boolean(reqData.confirmed_by_owner && reqData.confirmed_by_requester);

          if (shouldComplete) {
            reqData.request_status = "Completed";
            listingData.status = "Completed";

            tx.update(reqRef, {
              confirmed_by_owner: Boolean(reqData.confirmed_by_owner),
              confirmed_by_requester: true,
              request_status: "Completed",
              completed_by_uid: session.uid || reqData.requester_uid || null,
              completed_at: FieldValue.serverTimestamp(),
            });

            tx.update(listingRef, {
              status: "Completed",
              completed_at: FieldValue.serverTimestamp(),
            });

            if (reqData.requester_email) {
              const lockRef = adminDb
                .collection("request_locks")
                .doc(`${targetListingId}_${reqData.requester_email.toLowerCase()}`);
              tx.set(lockRef, { active: false }, { merge: true });
            }

            // Atomically increment statistics/global.reuseCount ONLY for genuine non-test Requests
            if (reqData.is_test === false) {
              const categoryKey = String(
                listingData.reuse_category || listingData.category || "Exchange"
              );
              if (!statsSnap.exists) {
                tx.set(statsRef, {
                  reuseCount: 1,
                  [categoryKey]: 1,
                  updatedAt: FieldValue.serverTimestamp(),
                });
              } else {
                tx.update(statsRef, {
                  reuseCount: FieldValue.increment(1),
                  [categoryKey]: FieldValue.increment(1),
                  updatedAt: FieldValue.serverTimestamp(),
                });
              }
            }
          } else {
            tx.update(reqRef, {
              confirmed_by_owner: Boolean(reqData.confirmed_by_owner),
              confirmed_by_requester: Boolean(reqData.confirmed_by_requester),
            });
          }

          return {
            listing: toPublicListing(listingData, session.email),
            request: reqData,
          };
        });
        return withCors(req, NextResponse.json(result, { status: 200 }));
      }
    }

    // =========================================================================
    // 6. CHATS & INBOX
    // =========================================================================
    if (method === "GET" && routePath === "/threads") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const snap = await adminDb
        .collection("threads")
        .where("participants", "array-contains", session.email.toLowerCase())
        .get();
      const threads = snap.docs.map((d) =>
        toFrontendThread({ ...(d.data() as StoredThread), id: d.id }, session.email)
      );
      return withCors(req, NextResponse.json(threads, { status: 200 }));
    }

    if (
      method === "POST" &&
      path.length === 3 &&
      path[0] === "threads" &&
      path[2] === "messages"
    ) {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const threadId = decodeURIComponent(path[1]);
      const body = await req.json().catch(() => ({}));
      const text = String(body.text || body.message || "").trim();
      if (!text) return errorResponse(req, "Message text cannot be empty.", 400);

      const threadRef = adminDb.collection("threads").doc(threadId);
      const updated = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(threadRef);
        if (!snap.exists) throw new Error("NOT_FOUND");
        const thread = { ...(snap.data() as StoredThread), id: snap.id };
        const caller = session.email.toLowerCase();

        if (!thread.participants.map((p) => p.toLowerCase()).includes(caller)) {
          throw new Error("FORBIDDEN");
        }

        thread.messages.push({
          id: crypto.randomUUID(),
          senderEmail: caller,
          text,
          time: new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }),
        });

        for (const p of thread.participants) {
          if (p.toLowerCase() !== caller) {
            thread.unreadBy[p.toLowerCase()] = Number(thread.unreadBy[p.toLowerCase()] || 0) + 1;
          }
        }

        tx.update(threadRef, {
          messages: thread.messages,
          unreadBy: thread.unreadBy,
        });

        return toFrontendThread(thread, caller);
      });

      return withCors(req, NextResponse.json(updated, { status: 200 }));
    }

    if (
      method === "POST" &&
      path.length === 3 &&
      path[0] === "threads" &&
      path[2] === "read"
    ) {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const threadId = decodeURIComponent(path[1]);
      const threadRef = adminDb.collection("threads").doc(threadId);

      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(threadRef);
        if (!snap.exists) throw new Error("NOT_FOUND");
        const thread = snap.data() as StoredThread;
        const caller = session.email.toLowerCase();
        if (!thread.participants.map((p) => p.toLowerCase()).includes(caller)) {
          throw new Error("FORBIDDEN");
        }
        tx.update(threadRef, { [`unreadBy.${caller}`]: 0 });
      });

      return withCors(req, new NextResponse(null, { status: 204 }));
    }

    // =========================================================================
    // 7. WANTED POSTS
    // =========================================================================
    if (method === "GET" && routePath === "/wanted") {
      const snap = await adminDb.collection("wanted_posts").get();
      const posts = snap.docs.map((d) =>
        toPublicWanted({ ...(d.data() as StoredWanted), id: d.id })
      );
      return withCors(req, NextResponse.json(posts, { status: 200 }));
    }

    if (method === "POST" && routePath === "/wanted") {
      if (!session || !isValidUmEmail(session.email)) {
        return errorResponse(req, "Verified UM student account required.", 401);
      }
      const body = await req.json().catch(() => ({}));
      const title = String(body.title || "").trim();
      if (!title) return errorResponse(req, "Wanted post title is required.", 400);

      const budget = Number(body.budget ?? 0);
      if (Number.isNaN(budget) || budget < 0) {
        return errorResponse(req, "Budget must be a non-negative number.", 400);
      }

      const id = crypto.randomUUID();
      const post: StoredWanted = {
        id,
        title,
        category: ALLOWED_CATEGORIES.includes(body.category) ? body.category : "Books",
        budget,
        donation: Boolean(body.donation ?? budget === 0),
        faculty: String(body.faculty || session.faculty || "Faculty of Computer Science & IT"),
        year: String(body.year || session.year || "Year 2"),
        posted: "Just now",
        location: String(body.location || session.pickup || "Central Library"),
        description: String(body.description || ""),
        requester: session.name || "Verified UM student",
        owner_email: session.email,
      };

      await adminDb.collection("wanted_posts").doc(id).set(post);
      return withCors(req, NextResponse.json(toPublicWanted(post), { status: 201 }));
    }

    if (
      method === "POST" &&
      path.length === 3 &&
      path[0] === "wanted" &&
      path[2] === "offers"
    ) {
      if (!session || !isValidUmEmail(session.email)) {
        return errorResponse(req, "Verified UM student account required.", 401);
      }
      const wantedId = decodeURIComponent(path[1]);
      const wantedSnap = await adminDb.collection("wanted_posts").doc(wantedId).get();
      if (!wantedSnap.exists) {
        return errorResponse(req, "Wanted post not found.", 404);
      }

      const wantedPost = wantedSnap.data() as StoredWanted;
      const offererEmail = session.email.toLowerCase();
      const posterEmail = wantedPost.owner_email.toLowerCase();

      if (offererEmail === posterEmail) {
        return errorResponse(req, "You cannot submit an offer on your own wanted post.", 403);
      }

      const body = await req.json().catch(() => ({}));
      const offerText = String(body.message || "Hi! I have this item available for you.").trim();
      if (!offerText) return errorResponse(req, "Offer message cannot be empty.", 400);

      const pairHash = crypto
        .createHash("sha256")
        .update(`${wantedId}:${offererEmail}`)
        .digest("hex")
        .slice(0, 16);
      const threadId = `thread-wanted-${pairHash}`;
      const threadRef = adminDb.collection("threads").doc(threadId);

      const frontendThread = await adminDb.runTransaction(async (tx) => {
        const tSnap = await tx.get(threadRef);
        let thread: StoredThread;

        if (tSnap.exists) {
          thread = { ...(tSnap.data() as StoredThread), id: tSnap.id };
        } else {
          thread = {
            id: threadId,
            listingId: String(body.listing_id || wantedId),
            participants: [posterEmail, offererEmail],
            participantNames: {
              [posterEmail]: wantedPost.requester,
              [offererEmail]: session.name || offererEmail.split("@")[0],
            },
            unreadBy: {
              [posterEmail]: 0,
              [offererEmail]: 0,
            },
            messages: [],
          };
        }

        thread.messages.push({
          id: crypto.randomUUID(),
          senderEmail: offererEmail,
          text: offerText,
          time: new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }),
        });
        thread.unreadBy[posterEmail] = Number(thread.unreadBy[posterEmail] || 0) + 1;

        tx.set(threadRef, thread);
        return toFrontendThread(thread, offererEmail);
      });

      return withCors(req, NextResponse.json(frontendThread, { status: 201 }));
    }

    // =========================================================================
    // 8. REUSE METRICS (Reads single `statistics/global` counter doc)
    // =========================================================================
    if (method === "GET" && routePath === "/metrics/reuse") {
      const statsSnap = await adminDb.collection("statistics").doc("global").get();
      const data = statsSnap.exists ? statsSnap.data() || {} : {};
      const globalCount = Number(data.reuseCount ?? 0);

      const counts: Record<"Exchange" | "Donation" | "Affordable Resale" | "Recyclable", number> = {
        Exchange: Number(data.Exchange ?? globalCount),
        Donation: Number(data.Donation ?? 0),
        "Affordable Resale": Number(data["Affordable Resale"] ?? 0),
        Recyclable: Number(data.Recyclable ?? 0),
      };

      return withCors(req, NextResponse.json(counts, { status: 200 }));
    }

    // =========================================================================
    // 9. QR PAYMENT TRANSACTIONS & PRODUCT BOOSTING
    // =========================================================================
    if (method === "GET" && routePath === "/transactions") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const snap = await adminDb
        .collection("transactions")
        .where("userEmail", "==", session.email.toLowerCase())
        .get();
      const txList = snap.docs.map((d) => ({ ...(d.data() as BoostTransaction), id: d.id }));
      return withCors(req, NextResponse.json(txList, { status: 200 }));
    }

    if (method === "POST" && routePath === "/transactions/boost") {
      if (!session) return errorResponse(req, "Authentication required.", 401);
      const body = await req.json().catch(() => ({}));
      const listingId = String(body.listingId || body.listing_id || "").trim();
      const amount = Number(body.amount ?? 5);
      if (!listingId || Number.isNaN(amount) || amount <= 0) {
        return errorResponse(req, "Valid listingId and positive payment amount are required.", 400);
      }

      const txId = crypto.randomUUID();
      const listingRef = adminDb.collection("listings").doc(listingId);
      const txRef = adminDb.collection("transactions").doc(txId);

      const boostRecord = await adminDb.runTransaction(async (tx) => {
        const lSnap = await tx.get(listingRef);
        if (!lSnap.exists) throw new Error("NOT_FOUND");
        const listing = lSnap.data() as StoredListing;
        if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
          throw new Error("FORBIDDEN");
        }

        const boostedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const record: BoostTransaction = {
          id: txId,
          listingId,
          userEmail: session.email,
          amount,
          currency: "MYR",
          paymentMethod: "QR_CODE",
          status: "Completed",
          createdAt: new Date().toISOString(),
        };

        tx.update(listingRef, { is_boosted: true, boosted_until: boostedUntil });
        tx.set(txRef, record);
        return record;
      });

      return withCors(req, NextResponse.json(boostRecord, { status: 201 }));
    }

    return errorResponse(req, `Endpoint ${method} ${routePath} not found`, 404);
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : "INTERNAL_ERROR";
    if (code === "NOT_FOUND") return errorResponse(req, "Requested resource not found.", 404);
    if (code === "FORBIDDEN") return errorResponse(req, "Forbidden operation.", 403);
    if (code === "FORBIDDEN_BUYER_ONLY") {
      return errorResponse(req, "Only the authenticated buyer can confirm item receipt.", 403);
    }
    if (code === "SELF_REQUEST") {
      return errorResponse(req, "You cannot request your own listing.", 403);
    }
    if (code === "UNAVAILABLE") {
      return errorResponse(req, "Listing is already reserved or unavailable.", 409);
    }
    if (code === "DUPLICATE_REQUEST") {
      return errorResponse(req, "You already have an active request for this listing.", 409);
    }
    if (code === "ALREADY_COMPLETED") {
      return errorResponse(req, "This request has already been completed.", 409);
    }
    if (
      code === "CONFLICT" ||
      code === "CONFLICT_NOT_PENDING" ||
      code === "CONFLICT_NOT_RESERVED" ||
      code === "CONFLICT_INVALID_CANCEL" ||
      code === "CONFLICT_HANDOVER" ||
      code === "CONFLICT_COMPLETED"
    ) {
      return errorResponse(req, `Invalid state transition (${code}).`, 409);
    }

    console.error("[UMLoop API Error]", err);
    return errorResponse(req, "Database or server error while processing request.", 500);
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
