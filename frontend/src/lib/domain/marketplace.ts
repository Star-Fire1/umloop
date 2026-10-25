import type { Listing, PickupRequest, Profile, ReuseCategory } from "@/types/marketplace";

export const UM_EMAIL_PATTERN = /^[^\s@]+@siswa\.um\.edu\.my$/i;

// These checks guide the UI; the backend must enforce them as well.
export function canRequestItem(
    profile: Profile,
    listing: Listing,
    requests: PickupRequest[]
): string | null {
    if (!profile.loggedIn || !profile.verified || !UM_EMAIL_PATTERN.test(profile.email)) {
        return "Sign in with a verified @siswa.um.edu.my email to request an item.";
    }
    if (listing.status !== "Available" || listing.is_paused) {
        return "This item is not available for requests.";
    }
    if (listing.owner || listing.owner_email?.toLowerCase() === profile.email.toLowerCase()) {
        return "You cannot request your own listing.";
    }
    if (requests.some(request =>
        request.listingId === listing.id &&
        request.requester_email.toLowerCase() === profile.email.toLowerCase() &&
        request.request_status === "Pending"
    )) {
        return "You already have a pending request for this item.";
    }
    return null;
}

// Check the student account before posting.
export function canPostItem(profile: Profile): boolean {
    return profile.loggedIn && profile.verified && UM_EMAIL_PATTERN.test(profile.email);
}

// Accepting a request reserves the item in the mock workflow.
export function acceptRequest(
    listing: Listing,
    request: PickupRequest
): { listing: Listing; request: PickupRequest } {
    if (listing.status !== "Available" || listing.is_paused || request.request_status !== "Pending") {
        throw new Error("Only pending requests for available listings can be accepted.");
    }
    return {
        listing: { ...listing, status: "Reserved" },
        request: { ...request, request_status: "Accepted" }
    };
}

// Keep the item reserved until both students confirm pickup.
export function confirmHandover(
    listing: Listing,
    request: PickupRequest,
    party: "owner" | "requester"
): { listing: Listing; request: PickupRequest } {
    if (listing.status !== "Reserved" || request.request_status !== "Accepted") {
        throw new Error("Only accepted requests on reserved listings can be completed.");
    }
    const updated = {
        ...request,
        confirmed_by_owner: party === "owner" || !!request.confirmed_by_owner,
        confirmed_by_requester: party === "requester" || !!request.confirmed_by_requester
    };
    const complete = updated.confirmed_by_owner && updated.confirmed_by_requester;
    return {
        listing: complete ? { ...listing, status: "Completed" } : listing,
        request: complete ? { ...updated, request_status: "Completed" } : updated
    };
}

// Only real, completed listings count towards reuse totals.
export function completedReuseCounts(listings: Listing[]): Record<ReuseCategory, number> {
    const totals: Record<ReuseCategory, number> = {
        Exchange: 0,
        Donation: 0,
        "Affordable Resale": 0,
        Recyclable: 0
    };
    for (const listing of listings) {
        if (listing.status === "Completed" && listing.is_test === false) {
            totals[listing.reuse_category] += 1;
        }
    }
    return totals;
}
