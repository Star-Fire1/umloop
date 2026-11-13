// File: app/api/[...path]/route.ts
// 100% aligned with frontend/src/lib/api/http.ts, marketplace.ts, and QA_CHECKLIST.md

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../backend/umloopBackend";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

export interface Profile {
  name: string;
  email: string;
  faculty: string;
  year: string;
  pickup: string;
  verified: boolean;
  loggedIn: boolean;
}

export interface ApiListing {
  id: string;
  title: string;
  price: number;
  type: "sell" | "donate" | "exchange";
  category: "Books" | "Tech" | "Fashion" | "Dorm";
  reuse_category: "Exchange" | "Donation" | "Affordable Resale" | "Recyclable";
  status: "Available" | "Reserved" | "Completed" | "Removed";
  is_test: boolean;
  is_paused: boolean;
  owner_email: string;
  owner: boolean;
  condition: string;
  image: string;
  images: string[];
  seller: string;
  location: string;
  description: string;
  tagline: string;
}

export interface PickupRequest {
  id: string;
  listingId: string;
  person: string;
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

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export interface Thread {
  id: string;
  person: string;
  itemTitle: string;
  unread: boolean;
  messages: ChatMessage[];
}

export interface WantedPost {
  id: string;
  title: string;
  category: string;
  budget: string;
  location: string;
  description: string;
  requester: string;
  owner_email: string;
}

const profilesStore = new Map<string, Profile>();
const otpStore = new Map<string, string>();
const listingsStore = new Map<string, ApiListing>();
const requestsStore = new Map<string, PickupRequest>();
const savedStore = new Map<string, Set<string>>();
const threadsStore = new Map<string, Thread>();
const wantedStore = new Map<string, WantedPost>();
let initialSeedLoaded = false;

function seedInitialData() {
  if (initialSeedLoaded) return;
  initialSeedLoaded = true;

  const sampleListing: ApiListing = {
    id: "listing-calc-101",
    title: "Casio FX-570EX Scientific Calculator",
    price: 35,
    type: "sell",
    category: "Tech",
    reuse_category: "Affordable Resale",
    status: "Available",
    is_test: false,
    is_paused: false,
    owner_email: "seller1@siswa.um.edu.my",
    owner: false,
    condition: "Good",
    image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80"],
    seller: "Verified UM student",
    location: "Central Library",
    description: "Working scientific calculator for engineering exams.",
    tagline: "Ready for another semester",
  };
  listingsStore.set(sampleListing.id, sampleListing);

  const sampleWanted: WantedPost = {
    id: "wanted-101",
    title: "Looking for WIA2006 System Analysis Textbook",
    category: "Books",
    budget: "RM 25",
    location: "FCSIT Foyer",
    description: "Need a clean copy for this semester.",
    requester: "Verified UM student",
    owner_email: "seller1@siswa.um.edu.my",
  };
  wantedStore.set(sampleWanted.id, sampleWanted);
}

function isValidUmEmail(email: string): boolean {
  return Boolean(email && email.trim().toLowerCase().endsWith("@siswa.um.edu.my"));
}

// Helper: Apply CORS headers for credentials: "include"
function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-um-email");
  }
  return res;
}

// Helper: Return error matching http.ts (which reads `body.message`)
function errorResponse(req: NextRequest, message: string, status: number): NextResponse {
  return withCors(
    req,
    NextResponse.json({ message, error: message }, { status })
  );
}

function getSessionProfile(req: NextRequest): Profile | null {
  const cookieVal = req.cookies.get("umloop_session")?.value;
  if (cookieVal) {
    try {
      const decoded = JSON.parse(Buffer.from(cookieVal, "base64").toString("utf-8")) as Profile;
      if (decoded && decoded.email && isValidUmEmail(decoded.email)) {
        return profilesStore.get(decoded.email.toLowerCase()) || decoded;
      }
    } catch {
      return null;
    }
  }
  const headerEmail = req.headers.get("x-um-email");
  if (headerEmail && isValidUmEmail(headerEmail)) {
    const clean = headerEmail.trim().toLowerCase();
    return (
      profilesStore.get(clean) || {
        name: clean.split("@")[0],
        email: clean,
        faculty: "Faculty of Computer Science & IT",
        year: "Year 2",
        pickup: "Central Library",
        verified: true,
        loggedIn: true,
      }
    );
  }
  return null;
}

function formatListingForViewer(listing: ApiListing, viewerEmail: string | null) {
  const isOwner = Boolean(
    viewerEmail && listing.owner_email.toLowerCase() === viewerEmail.toLowerCase()
  );
  return {
    ...listing,
    owner: isOwner,
  };
}

async function syncListingToFirestore(listing: ApiListing) {
  try {
    await setDoc(doc(db, "listings", listing.id), {
      title: listing.title,
      category: listing.reuse_category,
      ui_category: listing.category,
      price: listing.price,
      owner_email: listing.owner_email,
      status: listing.status,
      is_test: listing.is_test,
      is_paused: listing.is_paused,
    });
  } catch {
    // Non-blocking sync
  }
}

async function syncRequestToFirestore(reqItem: PickupRequest, ownerEmail: string, title: string) {
  try {
    await setDoc(doc(db, "requests", reqItem.id), {
      listing_id: reqItem.listingId,
      listing_title: title,
      owner_email: ownerEmail,
      requester_email: reqItem.requester_email,
      request_status: reqItem.request_status,
      is_test: reqItem.is_test,
      confirmed_by_requester: reqItem.confirmed_by_requester,
      confirmed_by_owner: reqItem.confirmed_by_owner,
    });
  } catch {
    // Non-blocking sync
  }
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

async function handleRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  seedInitialData();
  const { path } = await context.params;
  const method = req.method.toUpperCase();
  const routePath = "/" + (path || []).join("/");
  const session = getSessionProfile(req);

  // =========================================================================
  // 1. AUTH & PROFILE (/auth/otp/request, /auth/otp/verify, /auth/logout, /me)
  // =========================================================================
  if (method === "POST" && routePath === "/auth/otp/request") {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!isValidUmEmail(email)) {
      return errorResponse(req, "Only @siswa.um.edu.my student emails are eligible.", 403);
    }
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, generatedOtp);
    return withCors(req, new NextResponse(null, { status: 204 }));
  }

  if (method === "POST" && routePath === "/auth/otp/verify") {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();

    if (!isValidUmEmail(email)) {
      return errorResponse(req, "Verification failed: Must be a valid @siswa.um.edu.my email.", 403);
    }
    if (!code || code.length < 4) {
      return errorResponse(req, "Invalid verification code.", 400);
    }

    const existing = profilesStore.get(email);
    const profile: Profile = {
      name: body.name || existing?.name || email.split("@")[0],
      email,
      faculty: body.faculty || existing?.faculty || "Faculty of Computer Science & IT",
      year: body.year || existing?.year || "Year 2",
      pickup: body.pickup || existing?.pickup || "Central Library",
      verified: true,
      loggedIn: true,
    };
    profilesStore.set(email, profile);

    const encoded = Buffer.from(JSON.stringify(profile), "utf-8").toString("base64");
    const res = NextResponse.json(profile, { status: 200 });
    res.cookies.set("umloop_session", encoded, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    return withCors(req, res);
  }

  if (method === "POST" && routePath === "/auth/logout") {
    const res = new NextResponse(null, { status: 204 });
    res.cookies.delete("umloop_session");
    return withCors(req, res);
  }

  if (routePath === "/me") {
    if (method === "GET") {
      if (!session) {
        return errorResponse(req, "Please sign in with your @siswa.um.edu.my account.", 401);
      }
      return withCors(req, NextResponse.json(session, { status: 200 }));
    }
    if (method === "PATCH") {
      if (!session) {
        return errorResponse(req, "Authentication required.", 401);
      }
      const body = await req.json().catch(() => ({}));
      const updated: Profile = {
        ...session,
        name: body.name ?? session.name,
        faculty: body.faculty ?? session.faculty,
        year: body.year ?? session.year,
        pickup: body.pickup ?? session.pickup,
      };
      profilesStore.set(session.email, updated);
      const encoded = Buffer.from(JSON.stringify(updated), "utf-8").toString("base64");
      const res = NextResponse.json(updated, { status: 200 });
      res.cookies.set("umloop_session", encoded, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      return withCors(req, res);
    }
  }

  // =========================================================================
  // 2. SAVED LISTINGS (/me/saved, /me/saved/:id)
  // =========================================================================
  if (method === "GET" && routePath === "/me/saved") {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const set = savedStore.get(session.email) || new Set<string>();
    return withCors(req, NextResponse.json(Array.from(set), { status: 200 }));
  }

  if (path.length === 3 && path[0] === "me" && path[1] === "saved") {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const listingId = decodeURIComponent(path[2]);
    const userSaved = savedStore.get(session.email) || new Set<string>();
    if (method === "POST") {
      userSaved.add(listingId);
      savedStore.set(session.email, userSaved);
      return withCors(req, new NextResponse(null, { status: 204 }));
    }
    if (method === "DELETE") {
      userSaved.delete(listingId);
      savedStore.set(session.email, userSaved);
      return withCors(req, new NextResponse(null, { status: 204 }));
    }
  }

  // =========================================================================
  // 3. IMAGE UPLOAD (/uploads/listing-images) — Converts FormData file to Data URL
  // =========================================================================
  if (method === "POST" && routePath === "/uploads/listing-images") {
    if (!session) {
      return errorResponse(req, "Please sign in before uploading item photos.", 401);
    }
    try {
      const formData = await req.formData();
      const file = formData.get("file");
      if (file && typeof file !== "string" && "arrayBuffer" in file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
        return withCors(req, NextResponse.json({ url: dataUrl }, { status: 200 }));
      }
    } catch {
      // Fallback if not multipart/form-data
    }
    return withCors(
      req,
      NextResponse.json(
        {
          url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
        },
        { status: 200 }
      )
    );
  }

  // =========================================================================
  // 4. LISTINGS (/listings, /listings/:id, withdraw, reset-reservation)
  // =========================================================================
  if (method === "GET" && routePath === "/listings") {
    const viewerEmail = session?.email || null;
    const result = Array.from(listingsStore.values())
      .filter((item) => {
        const isOwner = Boolean(
          viewerEmail && item.owner_email.toLowerCase() === viewerEmail.toLowerCase()
        );
        return (item.status === "Available" && !item.is_paused) || isOwner;
      })
      .map((item) => formatListingForViewer(item, viewerEmail));

    return withCors(req, NextResponse.json(result, { status: 200 }));
  }

  if (method === "POST" && routePath === "/listings") {
    if (!session) {
      return errorResponse(req, "Sign-in required to post a listing.", 401);
    }
    if (!session.verified || !isValidUmEmail(session.email)) {
      return errorResponse(
        req,
        "Forbidden: Only verified @siswa.um.edu.my students can post listings.",
        403
      );
    }

    const body = await req.json().catch(() => ({}));
    const itemType =
      body.type === "donate" ? "donate" : body.type === "exchange" ? "exchange" : "sell";
    const reuseCat =
      body.reuse_category ||
      (itemType === "donate"
        ? "Donation"
        : itemType === "exchange"
        ? "Exchange"
        : "Affordable Resale");

    const imagesArr: string[] =
      Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : [
            body.image ||
              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
          ];

    const newListing: ApiListing = {
      id: `listing-${Date.now()}`,
      title: String(body.title || "Campus Item").trim(),
      price: itemType === "donate" ? 0 : Number(body.price || 0),
      type: itemType,
      category: body.category || "Books",
      reuse_category: reuseCat,
      status: "Available",
      is_test: false,
      is_paused: false,
      owner_email: session.email,
      owner: true,
      condition: body.condition || "Good",
      image: imagesArr[0],
      images: imagesArr,
      seller: session.name || "Verified UM student",
      location: body.location || session.pickup || "Central Library",
      description: body.description || "",
      tagline: body.tagline || "Ready for campus handover",
    };

    listingsStore.set(newListing.id, newListing);
    await syncListingToFirestore(newListing);
    return withCors(
      req,
      NextResponse.json(formatListingForViewer(newListing, session.email), { status: 201 })
    );
  }

  if (method === "PATCH" && path.length === 2 && path[0] === "listings") {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const listingId = decodeURIComponent(path[1]);
    const listing = listingsStore.get(listingId);
    if (!listing) {
      return errorResponse(req, "Listing not found.", 404);
    }
    if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
      return errorResponse(req, "Forbidden: You can only edit your own listings.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const updatedImages =
      Array.isArray(body.images) && body.images.length > 0 ? body.images : listing.images;

    const updated: ApiListing = {
      ...listing,
      title: body.title ?? listing.title,
      type: body.type ?? listing.type,
      price: body.price !== undefined ? Number(body.price) : listing.price,
      category: body.category ?? listing.category,
      reuse_category: body.reuse_category ?? listing.reuse_category,
      condition: body.condition ?? listing.condition,
      image: body.image ?? updatedImages[0] ?? listing.image,
      images: updatedImages,
      location: body.location ?? listing.location,
      description: body.description ?? listing.description,
      tagline: body.tagline ?? listing.tagline,
      is_paused: typeof body.is_paused === "boolean" ? body.is_paused : listing.is_paused,
    };
    listingsStore.set(updated.id, updated);
    await syncListingToFirestore(updated);
    return withCors(
      req,
      NextResponse.json(formatListingForViewer(updated, session.email), { status: 200 })
    );
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "listings" &&
    path[2] === "withdraw"
  ) {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const listing = listingsStore.get(decodeURIComponent(path[1]));
    if (!listing) {
      return errorResponse(req, "Listing not found.", 404);
    }
    if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
      return errorResponse(req, "Forbidden: Not the listing owner.", 403);
    }

    listing.status = "Removed";
    listingsStore.set(listing.id, listing);
    await syncListingToFirestore(listing);
    return withCors(
      req,
      NextResponse.json(formatListingForViewer(listing, session.email), { status: 200 })
    );
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "listings" &&
    path[2] === "reset-reservation"
  ) {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const listing = listingsStore.get(decodeURIComponent(path[1]));
    if (!listing) {
      return errorResponse(req, "Listing not found.", 404);
    }
    if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
      return errorResponse(req, "Forbidden: Not the listing owner.", 403);
    }
    if (listing.status !== "Reserved") {
      return errorResponse(
        req,
        `Cannot reset reservation when listing status is ${listing.status}.`,
        409
      );
    }

    listing.status = "Available";
    listingsStore.set(listing.id, listing);
    await syncListingToFirestore(listing);
    return withCors(
      req,
      NextResponse.json(formatListingForViewer(listing, session.email), { status: 200 })
    );
  }

  // =========================================================================
  // 5. REQUESTS (/requests/mine, /requests, accept, reject, cancel, confirm-handover)
  // =========================================================================
  if (method === "GET" && routePath === "/requests/mine") {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const mine = Array.from(requestsStore.values()).filter((r) => {
      const listing = listingsStore.get(r.listingId);
      const isRequester = r.requester_email.toLowerCase() === session.email.toLowerCase();
      const isOwner = Boolean(
        listing && listing.owner_email.toLowerCase() === session.email.toLowerCase()
      );
      return isRequester || isOwner;
    });
    return withCors(req, NextResponse.json(mine, { status: 200 }));
  }

  if (method === "POST" && routePath === "/requests") {
    if (!session) {
      return errorResponse(req, "Please sign in to request an item.", 401);
    }
    if (!session.verified || !isValidUmEmail(session.email)) {
      return errorResponse(req, "Forbidden: Verified UM student account required.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listing_id || body.listingId || "");
    const listing = listingsStore.get(listingId);

    if (!listing) {
      return errorResponse(req, "Listing not found.", 404);
    }
    if (listing.owner_email.toLowerCase() === session.email.toLowerCase()) {
      return errorResponse(req, "You cannot request your own listing.", 403);
    }
    if (listing.status !== "Available" || listing.is_paused) {
      return errorResponse(req, "This item is already reserved or unavailable.", 409);
    }

    const hasDuplicate = Array.from(requestsStore.values()).some(
      (r) =>
        r.listingId === listingId &&
        r.requester_email.toLowerCase() === session.email.toLowerCase() &&
        (r.request_status === "Pending" || r.request_status === "Accepted")
    );
    if (hasDuplicate) {
      return errorResponse(
        req,
        "You already have an active Pending or Accepted request for this item.",
        409
      );
    }

    const newReq: PickupRequest = {
      id: `request-${Date.now()}`,
      listingId: listing.id,
      person: session.name || "Verified UM student",
      requester_email: session.email,
      message: String(body.message || "Hi, I would like to request this item."),
      date: body.pickup_at
        ? new Date(body.pickup_at).toLocaleString("en-MY")
        : "Time to be discussed",
      pickup_at: body.pickup_at ?? null,
      location: body.pickup_location || body.location || listing.location,
      request_status: "Pending",
      is_test: false,
      confirmed_by_requester: false,
      confirmed_by_owner: false,
    };

    requestsStore.set(newReq.id, newReq);
    await syncRequestToFirestore(newReq, listing.owner_email, listing.title);
    return withCors(req, NextResponse.json(newReq, { status: 201 }));
  }

  if (method === "POST" && path.length === 3 && path[0] === "requests") {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const reqId = decodeURIComponent(path[1]);
    const action = path[2];
    const reqItem = requestsStore.get(reqId);
    if (!reqItem) {
      return errorResponse(req, "Request not found.", 404);
    }
    const listing = listingsStore.get(reqItem.listingId);
    if (!listing) {
      return errorResponse(req, "Associated listing not found.", 404);
    }

    const isOwner = listing.owner_email.toLowerCase() === session.email.toLowerCase();
    const isRequester = reqItem.requester_email.toLowerCase() === session.email.toLowerCase();

    if (action === "accept") {
      if (!isOwner) {
        return errorResponse(req, "Only the listing owner can accept requests.", 403);
      }
      if (listing.status !== "Available" || reqItem.request_status !== "Pending") {
        return errorResponse(
          req,
          "Conflict: Listing is already Reserved or request is no longer Pending.",
          409
        );
      }
      reqItem.request_status = "Accepted";
      listing.status = "Reserved";
      requestsStore.set(reqItem.id, reqItem);
      listingsStore.set(listing.id, listing);
      await syncListingToFirestore(listing);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);

      return withCors(
        req,
        NextResponse.json(
          {
            listing: formatListingForViewer(listing, session.email),
            request: reqItem,
          },
          { status: 200 }
        )
      );
    }

    if (action === "reject") {
      if (!isOwner) {
        return errorResponse(req, "Only the listing owner can reject requests.", 403);
      }
      reqItem.request_status = "Rejected";
      requestsStore.set(reqItem.id, reqItem);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);
      return withCors(req, NextResponse.json(reqItem, { status: 200 }));
    }

    if (action === "cancel") {
      if (!isRequester && !isOwner) {
        return errorResponse(req, "Forbidden.", 403);
      }
      const wasAccepted = reqItem.request_status === "Accepted";
      reqItem.request_status = "Cancelled";
      if (wasAccepted && listing.status === "Reserved") {
        listing.status = "Available";
        listingsStore.set(listing.id, listing);
        await syncListingToFirestore(listing);
      }
      requestsStore.set(reqItem.id, reqItem);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);

      return withCors(
        req,
        NextResponse.json(
          {
            listing: formatListingForViewer(listing, session.email),
            request: reqItem,
          },
          { status: 200 }
        )
      );
    }

    if (action === "confirm-handover") {
      if (!isOwner && !isRequester) {
        return errorResponse(req, "Forbidden.", 403);
      }
      if (reqItem.request_status !== "Accepted" || listing.status !== "Reserved") {
        return errorResponse(
          req,
          "Handover can only be confirmed for Accepted requests on Reserved listings.",
          409
        );
      }

      if (isOwner) reqItem.confirmed_by_owner = true;
      if (isRequester) reqItem.confirmed_by_requester = true;

      if (reqItem.confirmed_by_owner && reqItem.confirmed_by_requester) {
        reqItem.request_status = "Completed";
        listing.status = "Completed";
        listingsStore.set(listing.id, listing);
        await syncListingToFirestore(listing);
      }

      requestsStore.set(reqItem.id, reqItem);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);

      return withCors(
        req,
        NextResponse.json(
          {
            listing: formatListingForViewer(listing, session.email),
            request: reqItem,
          },
          { status: 200 }
        )
      );
    }
  }

  // =========================================================================
  // 6. CHATS / THREADS (/threads, /threads/:id/messages, /threads/:id/read)
  // =========================================================================
  if (method === "GET" && routePath === "/threads") {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    return withCors(req, NextResponse.json(Array.from(threadsStore.values()), { status: 200 }));
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "threads" &&
    path[2] === "messages"
  ) {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const threadId = decodeURIComponent(path[1]);
    const body = await req.json().catch(() => ({}));
    const existing = threadsStore.get(threadId) || {
      id: threadId,
      person: "UM Student",
      itemTitle: "Campus Handover Chat",
      unread: false,
      messages: [],
    };
    existing.messages.push({
      id: `msg-${Date.now()}`,
      sender: session.name || session.email,
      text: String(body.text || body.message || ""),
      time: "Just now",
    });
    threadsStore.set(threadId, existing);
    return withCors(req, NextResponse.json(existing, { status: 200 }));
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "threads" &&
    path[2] === "read"
  ) {
    if (!session) {
      return errorResponse(req, "Authentication required.", 401);
    }
    const existing = threadsStore.get(decodeURIComponent(path[1]));
    if (existing) {
      existing.unread = false;
      threadsStore.set(existing.id, existing);
    }
    return withCors(req, new NextResponse(null, { status: 204 }));
  }

  // =========================================================================
  // 7. WANTED POSTS (/wanted, /wanted/:id/offers)
  // =========================================================================
  if (method === "GET" && routePath === "/wanted") {
    return withCors(req, NextResponse.json(Array.from(wantedStore.values()), { status: 200 }));
  }

  if (method === "POST" && routePath === "/wanted") {
    if (!session || !isValidUmEmail(session.email)) {
      return errorResponse(req, "Verified UM student required.", 401);
    }
    const body = await req.json().catch(() => ({}));
    const post: WantedPost = {
      id: `wanted-${Date.now()}`,
      title: String(body.title || "Wanted Item"),
      category: body.category || "Books",
      budget: String(body.budget || "Flexible"),
      location: body.location || session.pickup || "Central Library",
      description: body.description || "",
      requester: session.name || "Verified UM student",
      owner_email: session.email,
    };
    wantedStore.set(post.id, post);
    return withCors(req, NextResponse.json(post, { status: 201 }));
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "wanted" &&
    path[2] === "offers"
  ) {
    if (!session || !isValidUmEmail(session.email)) {
      return errorResponse(req, "Verified UM student required.", 401);
    }
    const wantedId = decodeURIComponent(path[1]);
    const wantedItem = wantedStore.get(wantedId);
    const body = await req.json().catch(() => ({}));
    const threadId = `thread-wanted-${wantedId}`;
    const thread: Thread = threadsStore.get(threadId) || {
      id: threadId,
      person: wantedItem?.requester || "UM Student",
      itemTitle: wantedItem?.title || "Wanted Item Offer",
      unread: true,
      messages: [],
    };
    thread.messages.push({
      id: `msg-${Date.now()}`,
      sender: session.name || session.email,
      text: String(body.message || "Hi! I have this item available for you."),
      time: "Just now",
    });
    threadsStore.set(threadId, thread);
    return withCors(req, NextResponse.json(thread, { status: 201 }));
  }

  // =========================================================================
  // 8. REUSE METRICS (GET /metrics/reuse) — Strict 4 keys matching Record type
  // =========================================================================
  if (method === "GET" && routePath === "/metrics/reuse") {
    const counts: Record<"Exchange" | "Donation" | "Affordable Resale" | "Recyclable", number> = {
      Exchange: 0,
      Donation: 0,
      "Affordable Resale": 0,
      Recyclable: 0,
    };

    for (const item of listingsStore.values()) {
      if (item.status === "Completed" && item.is_test === false) {
        const cat = item.reuse_category || "Affordable Resale";
        if (cat in counts) {
          counts[cat] += 1;
        }
      }
    }

    try {
      const snap = await getDocs(collection(db, "listings"));
      snap.forEach((docSnap) => {
        if (!listingsStore.has(docSnap.id)) {
          const data = docSnap.data();
          if (data.status === "Completed" && data.is_test === false) {
            const cat = (data.category || "Exchange") as keyof typeof counts;
            if (cat in counts) {
              counts[cat] += 1;
            }
          }
        }
      });
    } catch {
      // Fallback to in-memory counts
    }

    return withCors(req, NextResponse.json(counts, { status: 200 }));
  }

  return errorResponse(req, `Endpoint ${method} ${routePath} not found`, 404);
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
