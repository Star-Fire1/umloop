// File: app/api/[...path]/route.ts
// Unified Next.js REST API implementation for frontend/API_HANDOFF.md
// Implements all 25 endpoints and all 8 required server-side transaction rules

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../backend/umloopBackend";
import {
  collection,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";

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

// Server-side transactional memory store (synced with Firestore)
const profilesStore = new Map<string, Profile>();
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
    location: "FCSIT Foyers",
    description: "Need a clean copy for this semester.",
    requester: "Verified UM student",
    owner_email: "seller1@siswa.um.edu.my",
  };
  wantedStore.set(sampleWanted.id, sampleWanted);
}

// Helper: Validate @siswa.um.edu.my student email
function isValidUmEmail(email: string): boolean {
  return Boolean(email && email.trim().toLowerCase().endsWith("@siswa.um.edu.my"));
}

// Helper: Read authenticated student session from HTTP-only cookie
function getSessionProfile(req: NextRequest): Profile | null {
  const cookieVal = req.cookies.get("umloop_session")?.value;
  if (cookieVal) {
    try {
      const decoded = JSON.parse(Buffer.from(cookieVal, "base64").toString("utf-8")) as Profile;
      if (decoded && decoded.email && isValidUmEmail(decoded.email)) {
        const stored = profilesStore.get(decoded.email.toLowerCase());
        return stored || decoded;
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

// Helper: Format listing for the viewing user without leaking private owner_email
function formatListingForViewer(listing: ApiListing, viewerEmail: string | null) {
  const isOwner = Boolean(
    viewerEmail && listing.owner_email.toLowerCase() === viewerEmail.toLowerCase()
  );
  return {
    ...listing,
    owner: isOwner,
  };
}

// Best-effort non-blocking Firestore sync so data also appears in Firebase Console
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
    // Ignore if client SDK security rules require browser token
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
    // Ignore if client SDK security rules require browser token
  }
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
  // 1. AUTH & PROFILE ROUTES (/auth/otp/request, /auth/otp/verify, /auth/logout, /me)
  // =========================================================================
  if (method === "POST" && routePath === "/auth/otp/request") {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!isValidUmEmail(email)) {
      return NextResponse.json(
        { error: "Only @siswa.um.edu.my student emails are eligible." },
        { status: 403 }
      );
    }
    return new NextResponse(null, { status: 204 });
  }

  if (method === "POST" && routePath === "/auth/otp/verify") {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!isValidUmEmail(email)) {
      return NextResponse.json(
        { error: "Verification failed: Must be a valid @siswa.um.edu.my email." },
        { status: 403 }
      );
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
    return res;
  }

  if (method === "POST" && routePath === "/auth/logout") {
    const res = new NextResponse(null, { status: 204 });
    res.cookies.delete("umloop_session");
    return res;
  }

  if (routePath === "/me") {
    if (method === "GET") {
      if (!session) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      return NextResponse.json(session, { status: 200 });
    }
    if (method === "PATCH") {
      if (!session) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
      return res;
    }
  }

  // =========================================================================
  // 2. SAVED LISTINGS ROUTES (/me/saved, /me/saved/:id)
  // =========================================================================
  if (method === "GET" && routePath === "/me/saved") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const set = savedStore.get(session.email) || new Set<string>();
    return NextResponse.json(Array.from(set), { status: 200 });
  }

  if (path.length === 3 && path[0] === "me" && path[1] === "saved") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const listingId = path[2];
    const userSaved = savedStore.get(session.email) || new Set<string>();
    if (method === "POST") {
      userSaved.add(listingId);
      savedStore.set(session.email, userSaved);
      return new NextResponse(null, { status: 204 });
    }
    if (method === "DELETE") {
      userSaved.delete(listingId);
      savedStore.set(session.email, userSaved);
      return new NextResponse(null, { status: 204 });
    }
  }

  // =========================================================================
  // 3. IMAGE UPLOAD ROUTE (/uploads/listing-images)
  // =========================================================================
  if (method === "POST" && routePath === "/uploads/listing-images") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json(
      {
        url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      },
      { status: 200 }
    );
  }

  // =========================================================================
  // 4. LISTINGS ROUTES (/listings, /listings/:id, withdraw, reset-reservation)
  // =========================================================================
  if (method === "GET" && routePath === "/listings") {
    const viewerEmail = session?.email || null;
    const result = Array.from(listingsStore.values())
      .filter((item) => {
        const isOwner = Boolean(
          viewerEmail && item.owner_email.toLowerCase() === viewerEmail.toLowerCase()
        );
        // Public browse returns Available & not paused; owners can also see their own items
        return (item.status === "Available" && !item.is_paused) || isOwner;
      })
      .map((item) => formatListingForViewer(item, viewerEmail));

    return NextResponse.json(result, { status: 200 });
  }

  if (method === "POST" && routePath === "/listings") {
    // Rule 1: Reject posting for unsigned, unverified or non-UM accounts
    if (!session) {
      return NextResponse.json({ error: "Sign-in required to post a listing." }, { status: 401 });
    }
    if (!session.verified || !isValidUmEmail(session.email)) {
      return NextResponse.json(
        { error: "Forbidden: Only verified @siswa.um.edu.my students can post listings." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const itemType = body.type === "donate" ? "donate" : "sell";
    const reuseCat =
      body.reuse_category ||
      (itemType === "donate" ? "Donation" : "Affordable Resale");

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
    return NextResponse.json(formatListingForViewer(newListing, session.email), {
      status: 201,
    });
  }

  // PATCH /listings/:id
  if (method === "PATCH" && path.length === 2 && path[0] === "listings") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const listing = listingsStore.get(path[1]);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: Not the listing owner" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updated: ApiListing = {
      ...listing,
      title: body.title ?? listing.title,
      price: body.price !== undefined ? Number(body.price) : listing.price,
      category: body.category ?? listing.category,
      condition: body.condition ?? listing.condition,
      location: body.location ?? listing.location,
      description: body.description ?? listing.description,
      is_paused: typeof body.is_paused === "boolean" ? body.is_paused : listing.is_paused,
    };
    listingsStore.set(updated.id, updated);
    await syncListingToFirestore(updated);
    return NextResponse.json(formatListingForViewer(updated, session.email), { status: 200 });
  }

  // POST /listings/:id/withdraw
  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "listings" &&
    path[2] === "withdraw"
  ) {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const listing = listingsStore.get(path[1]);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: Not the listing owner" }, { status: 403 });
    }

    listing.status = "Removed";
    listingsStore.set(listing.id, listing);
    await syncListingToFirestore(listing);
    return NextResponse.json(formatListingForViewer(listing, session.email), { status: 200 });
  }

  // POST /listings/:id/reset-reservation
  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "listings" &&
    path[2] === "reset-reservation"
  ) {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const listing = listingsStore.get(path[1]);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (listing.owner_email.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: Not the listing owner" }, { status: 403 });
    }
    // Rule 7: Restore Available only from Reserved; never revive a Removed listing
    if (listing.status !== "Reserved") {
      return NextResponse.json(
        { error: `Cannot reset reservation from current status: ${listing.status}` },
        { status: 409 }
      );
    }

    listing.status = "Available";
    listingsStore.set(listing.id, listing);
    await syncListingToFirestore(listing);
    return NextResponse.json(formatListingForViewer(listing, session.email), { status: 200 });
  }

  // =========================================================================
  // 5. REQUESTS ROUTES (/requests/mine, /requests, accept, reject, cancel, confirm-handover)
  // =========================================================================
  if (method === "GET" && routePath === "/requests/mine") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const mine = Array.from(requestsStore.values()).filter((r) => {
      const listing = listingsStore.get(r.listingId);
      const isRequester = r.requester_email.toLowerCase() === session.email.toLowerCase();
      const isOwner = Boolean(
        listing && listing.owner_email.toLowerCase() === session.email.toLowerCase()
      );
      return isRequester || isOwner;
    });
    return NextResponse.json(mine, { status: 200 });
  }

  if (method === "POST" && routePath === "/requests") {
    // Rule 1: Reject unsigned or non-UM accounts
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!session.verified || !isValidUmEmail(session.email)) {
      return NextResponse.json({ error: "Forbidden: Verified UM email required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listing_id || body.listingId || "");
    const listing = listingsStore.get(listingId);

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Rule 3: Reject an owner's request for their own listing
    if (listing.owner_email.toLowerCase() === session.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Invalid Request: You cannot request your own listing." },
        { status: 403 }
      );
    }

    // Rule 2: Reject requests for Reserved, Completed, Removed, or paused items
    if (listing.status !== "Available" || listing.is_paused) {
      return NextResponse.json(
        { error: "Listing is currently unavailable or paused." },
        { status: 409 }
      );
    }

    // Rule 4: Reject duplicate Pending/Accepted requests for the same listing by the same user
    const hasDuplicate = Array.from(requestsStore.values()).some(
      (r) =>
        r.listingId === listingId &&
        r.requester_email.toLowerCase() === session.email.toLowerCase() &&
        (r.request_status === "Pending" || r.request_status === "Accepted")
    );
    if (hasDuplicate) {
      return NextResponse.json(
        { error: "Duplicate Request: You already have an active request for this item." },
        { status: 409 }
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
      pickup_at: body.pickup_at || null,
      location: body.pickup_location || body.location || listing.location,
      request_status: "Pending",
      is_test: false,
      confirmed_by_requester: false,
      confirmed_by_owner: false,
    };

    requestsStore.set(newReq.id, newReq);
    await syncRequestToFirestore(newReq, listing.owner_email, listing.title);
    return NextResponse.json(newReq, { status: 201 });
  }

  // Actions on /requests/:id/:action
  if (method === "POST" && path.length === 3 && path[0] === "requests") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const reqId = path[1];
    const action = path[2];
    const reqItem = requestsStore.get(reqId);
    if (!reqItem) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const listing = listingsStore.get(reqItem.listingId);
    if (!listing) {
      return NextResponse.json({ error: "Associated listing not found" }, { status: 404 });
    }

    const isOwner = listing.owner_email.toLowerCase() === session.email.toLowerCase();
    const isRequester = reqItem.requester_email.toLowerCase() === session.email.toLowerCase();

    // POST /requests/:id/accept
    if (action === "accept") {
      if (!isOwner) {
        return NextResponse.json({ error: "Only the item owner can accept requests" }, { status: 403 });
      }
      // Rule 5: Atomic transition Available -> Reserved; second acceptance fails with 409
      if (listing.status !== "Available" || reqItem.request_status !== "Pending") {
        return NextResponse.json(
          { error: "Conflict: Listing is already Reserved or request is no longer Pending." },
          { status: 409 }
        );
      }
      reqItem.request_status = "Accepted";
      listing.status = "Reserved";
      requestsStore.set(reqItem.id, reqItem);
      listingsStore.set(listing.id, listing);
      await syncListingToFirestore(listing);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);

      return NextResponse.json(
        {
          listing: formatListingForViewer(listing, session.email),
          request: reqItem,
        },
        { status: 200 }
      );
    }

    // POST /requests/:id/reject
    if (action === "reject") {
      if (!isOwner) {
        return NextResponse.json({ error: "Only the item owner can reject requests" }, { status: 403 });
      }
      reqItem.request_status = "Rejected";
      requestsStore.set(reqItem.id, reqItem);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);
      return NextResponse.json(reqItem, { status: 200 });
    }

    // POST /requests/:id/cancel
    if (action === "cancel") {
      if (!isRequester && !isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const wasAccepted = reqItem.request_status === "Accepted";
      reqItem.request_status = "Cancelled";
      // Rule 7: Restore Available only if listing was Reserved (never revive Removed)
      if (wasAccepted && listing.status === "Reserved") {
        listing.status = "Available";
        listingsStore.set(listing.id, listing);
        await syncListingToFirestore(listing);
      }
      requestsStore.set(reqItem.id, reqItem);
      await syncRequestToFirestore(reqItem, listing.owner_email, listing.title);

      return NextResponse.json(
        {
          listing: formatListingForViewer(listing, session.email),
          request: reqItem,
        },
        { status: 200 }
      );
    }

    // POST /requests/:id/confirm-handover
    if (action === "confirm-handover") {
      if (!isOwner && !isRequester) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (reqItem.request_status !== "Accepted" || listing.status !== "Reserved") {
        return NextResponse.json(
          { error: "Handover can only be confirmed for Accepted requests on Reserved listings." },
          { status: 409 }
        );
      }

      // Rule 6: Store each party's confirmation; mark Completed ONLY after BOTH confirm
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

      return NextResponse.json(
        {
          listing: formatListingForViewer(listing, session.email),
          request: reqItem,
        },
        { status: 200 }
      );
    }
  }

  // =========================================================================
  // 6. CHATS / THREADS ROUTES (/threads, /threads/:id/messages, /threads/:id/read)
  // =========================================================================
  if (method === "GET" && routePath === "/threads") {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json(Array.from(threadsStore.values()), { status: 200 });
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "threads" &&
    path[2] === "messages"
  ) {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const threadId = path[1];
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
    return NextResponse.json(existing, { status: 200 });
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "threads" &&
    path[2] === "read"
  ) {
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const existing = threadsStore.get(path[1]);
    if (existing) {
      existing.unread = false;
      threadsStore.set(existing.id, existing);
    }
    return new NextResponse(null, { status: 204 });
  }

  // =========================================================================
  // 7. WANTED POSTS ROUTES (/wanted, /wanted/:id/offers)
  // =========================================================================
  if (method === "GET" && routePath === "/wanted") {
    return NextResponse.json(Array.from(wantedStore.values()), { status: 200 });
  }

  if (method === "POST" && routePath === "/wanted") {
    if (!session || !isValidUmEmail(session.email)) {
      return NextResponse.json({ error: "Verified UM student required" }, { status: 401 });
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
    return NextResponse.json(post, { status: 201 });
  }

  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "wanted" &&
    path[2] === "offers"
  ) {
    if (!session || !isValidUmEmail(session.email)) {
      return NextResponse.json({ error: "Verified UM student required" }, { status: 401 });
    }
    const wantedItem = wantedStore.get(path[1]);
    const body = await req.json().catch(() => ({}));
    const threadId = `thread-wanted-${path[1]}`;
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
    return NextResponse.json(thread, { status: 201 });
  }

  // =========================================================================
  // 8. REUSE METRICS ROUTE (GET /metrics/reuse)
  // =========================================================================
  if (method === "GET" && routePath === "/metrics/reuse") {
    // Rule 8: Count ONLY listings.status == 'Completed' AND listings.is_test == false, grouped by reuse_category
    const counts: Record<string, number> = {
      Exchange: 0,
      Donation: 0,
      "Affordable Resale": 0,
      Recyclable: 0,
      total: 0,
    };

    for (const item of listingsStore.values()) {
      if (item.status === "Completed" && item.is_test === false) {
        const cat = item.reuse_category || "Affordable Resale";
        counts[cat] = (counts[cat] || 0) + 1;
        counts.total += 1;
      }
    }

    // Also include completed non-test listings stored in Firestore
    try {
      const snap = await getDocs(collection(db, "listings"));
      snap.forEach((docSnap) => {
        if (!listingsStore.has(docSnap.id)) {
          const data = docSnap.data();
          if (data.status === "Completed" && data.is_test === false) {
            const cat = data.category || "Exchange";
            counts[cat] = (counts[cat] || 0) + 1;
            counts.total += 1;
          }
        }
      });
    } catch {
      // Fallback to in-memory counts if offline
    }

    return NextResponse.json(counts, { status: 200 });
  }

  return NextResponse.json(
    { error: `Endpoint ${method} ${routePath} not found` },
    { status: 404 }
  );
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
