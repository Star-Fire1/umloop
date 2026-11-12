// File: backend/umloopBackend.ts
// Complete Firebase Auth & Firestore Backend Workflow for KAN-60

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDfS_IOSbGPFEOgIrDb2eSDyScmp8_W7zk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "um-loop-test-1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "um-loop-test-1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "um-loop-test-1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "17432819430",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:17432819430:web:68f63014a8718c33afad27",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface ListingItem {
  id: string;
  title: string;
  category: string;
  owner_uid: string;
  owner_email: string;
  status: "Available" | "Reserved" | "Completed";
  is_test: boolean;
}

export interface RequestItem {
  id: string;
  listing_id: string;
  listing_title: string;
  owner_email: string;
  requester_uid: string;
  requester_email: string;
  request_status: "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";
  is_test: boolean;
}

export function isValidUmEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@siswa.um.edu.my");
}

export async function registerUmStudent(email: string, password: string) {
  if (!isValidUmEmail(email)) {
    throw new Error("Eligibility Error: Only @siswa.um.edu.my student emails are allowed to register.");
  }
  return await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInUmStudent(email: string, password: string) {
  if (!isValidUmEmail(email)) {
    throw new Error("Eligibility Error: Only @siswa.um.edu.my student emails are allowed to sign in.");
  }
  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutUmStudent() {
  return await signOut(auth);
}

export async function triggerVerificationEmail(user: User) {
  return await sendEmailVerification(user);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function createListing(
  user: User | null,
  title: string,
  category: string,
  isTest: boolean
) {
  if (!user || !user.email) {
    throw new Error("Auth Error: You must be signed in with a UM email to create a listing.");
  }
  if (!title.trim()) {
    throw new Error("Validation Error: Please enter an item title.");
  }

  return await addDoc(collection(db, "listings"), {
    title: title.trim(),
    category,
    owner_uid: user.uid,
    owner_email: user.email,
    status: "Available",
    is_test: isTest,
    created_at: serverTimestamp(),
  });
}

export function subscribeToListings(callback: (listings: ListingItem[], reuseCount: number) => void) {
  return onSnapshot(collection(db, "listings"), (snapshot) => {
    const items: ListingItem[] = [];
    let completedRealCount = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const item: ListingItem = {
        id: docSnap.id,
        title: data.title || "Untitled Item",
        category: data.category || "Exchange",
        owner_uid: data.owner_uid || "",
        owner_email: data.owner_email || "N/A",
        status: data.status || "Available",
        is_test: Boolean(data.is_test),
      };
      if (item.status === "Completed" && item.is_test === false) {
        completedRealCount++;
      }
      items.push(item);
    });

    callback(items, completedRealCount);
  });
}

// Save requests against the correct listing + block self/duplicate/unavailable requests (KAN-60)
export async function createPendingRequest(user: User | null, listing: ListingItem) {
  if (!user || !user.email) {
    throw new Error("Auth Error: Please sign in before requesting an item.");
  }
  if (
    listing.owner_uid === user.uid ||
    listing.owner_email.toLowerCase() === user.email.toLowerCase()
  ) {
    throw new Error("Invalid Request Blocked: You cannot request your own listing.");
  }
  if (listing.status !== "Available") {
    throw new Error(
      `Double-Reservation Blocked: This single-item listing is already ${listing.status} and cannot be reserved for another user.`
    );
  }

  const dupQuery = query(
    collection(db, "requests"),
    where("listing_id", "==", listing.id),
    where("requester_email", "==", user.email)
  );
  const dupSnap = await getDocs(dupQuery);

  let hasDuplicate = false;
  dupSnap.forEach((d) => {
    const status = d.data().request_status;
    if (status === "Pending" || status === "Accepted") {
      hasDuplicate = true;
    }
  });

  if (hasDuplicate) {
    throw new Error(
      "Repeated Submission Blocked: You already have an active Pending/Accepted request for this listing."
    );
  }

  return await addDoc(collection(db, "requests"), {
    listing_id: listing.id,
    listing_title: listing.title,
    owner_email: listing.owner_email,
    requester_uid: user.uid,
    requester_email: user.email,
    request_status: "Pending",
    is_test: Boolean(listing.is_test),
    requested_at: serverTimestamp(),
  });
}

export function subscribeToRequests(callback: (requests: RequestItem[]) => void) {
  return onSnapshot(collection(db, "requests"), (snapshot) => {
    const requests: RequestItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      requests.push({
        id: docSnap.id,
        listing_id: data.listing_id || "",
        listing_title: data.listing_title || "Untitled",
        owner_email: data.owner_email || "N/A",
        requester_uid: data.requester_uid || "",
        requester_email: data.requester_email || "N/A",
        request_status: data.request_status || "Pending",
        is_test: Boolean(data.is_test),
      });
    });
    callback(requests);
  });
}

// Owner Accept: Prevent the same single-item listing from being reserved for two people (KAN-60)
export async function acceptIncomingRequest(requestId: string, listingId: string) {
  const listingRef = doc(db, "listings", listingId);
  const listingSnap = await getDoc(listingRef);

  if (!listingSnap.exists()) {
    throw new Error("Listing not found.");
  }

  const currentStatus = listingSnap.data().status;
  if (currentStatus !== "Available") {
    throw new Error(
      `Single-Item Reservation Lock: Cannot accept this request because the listing is already '${currentStatus}' for another student.`
    );
  }

  await updateDoc(doc(db, "requests", requestId), { request_status: "Accepted" });
  await updateDoc(listingRef, { status: "Reserved" });
}

// Owner Reject (KAN-60)
export async function rejectIncomingRequest(requestId: string) {
  await updateDoc(doc(db, "requests", requestId), { request_status: "Rejected" });
}

// Cancel Request / Failed Handover: Update availability back to Available after cancellation (KAN-60)
export async function cancelRequestAndRestoreAvailability(
  requestId: string,
  listingId: string,
  currentRequestStatus: string
) {
  await updateDoc(doc(db, "requests", requestId), { request_status: "Cancelled" });

  // If the request had locked the item as Reserved, restore the listing back to Available
  if (currentRequestStatus === "Accepted") {
    await updateDoc(doc(db, "listings", listingId), { status: "Available" });
  }
}

// Complete Handover: Update availability to Completed after handover completion (KAN-60)
export async function completeItemHandover(requestId: string, listingId: string) {
  await updateDoc(doc(db, "requests", requestId), { request_status: "Completed" });
  await updateDoc(doc(db, "listings", listingId), { status: "Completed" });
}
