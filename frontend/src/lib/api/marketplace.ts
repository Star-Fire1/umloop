import { apiRequest, jsonBody } from "./http";
import type { Listing, PickupRequest, Profile, Thread, Wanted } from "@/types/marketplace";

// Convert local photo previews into uploaded image URLs.
async function uploadImage(image: string): Promise<string> {
    if (!image.startsWith("data:")) return image;
    const response = await fetch(image);
    const blob = await response.blob();
    const form = new FormData();
    form.append("file", blob, "listing.jpg");
    const uploaded = await apiRequest<{ url: string }>("/uploads/listing-images", {
        method: "POST", body: form
    });
    return uploaded.url;
}

// These calls share the HTTP helper and the backend URL.
export const marketplaceApi = {
    getProfile: () => apiRequest<Profile>("/me"),
    updateProfile: (input: Partial<Profile>) => apiRequest<Profile>("/me", {
        method: "PATCH", body: jsonBody(input)
    }),
    getListings: () => apiRequest<Listing[]>("/listings"),
    // Upload photos first, then submit the listing details.
    createListing: async (input: Listing) => {
        const images = await Promise.all((input.images?.length ? input.images : [input.image]).map(uploadImage));
        return apiRequest<Listing>("/listings", {
        method: "POST", body: jsonBody({
            title: input.title,
            type: input.type,
            price: input.price,
            category: input.category,
            reuse_category: input.reuse_category,
            condition: input.condition,
            image: images[0],
            images,
            location: input.location,
            description: input.description,
            tagline: input.tagline
        })
        });
    },
    updateListing: async (id: string, input: Partial<Listing>) => {
        const images = input.images ? await Promise.all(input.images.map(uploadImage)) : undefined;
        return apiRequest<Listing>(`/listings/${encodeURIComponent(id)}`, {
        method: "PATCH", body: jsonBody({
            title: input.title,
            type: input.type,
            price: input.price,
            category: input.category,
            reuse_category: input.reuse_category,
            condition: input.condition,
            image: images?.[0] ?? (input.image ? await uploadImage(input.image) : undefined),
            images,
            location: input.location,
            description: input.description,
            tagline: input.tagline,
            is_paused: input.is_paused
        })
        });
    },
    getRequests: () => apiRequest<PickupRequest[]>("/requests/mine"),
    acceptRequest: (id: string) => apiRequest<{ listing: Listing; request: PickupRequest }>(
        `/requests/${encodeURIComponent(id)}/accept`, { method: "POST" }
    ),
    rejectRequest: (id: string) => apiRequest<PickupRequest>(
        `/requests/${encodeURIComponent(id)}/reject`, { method: "POST" }
    ),
    cancelRequest: (id: string) => apiRequest<{ listing: Listing; request: PickupRequest }>(
        `/requests/${encodeURIComponent(id)}/cancel`, { method: "POST" }
    ),
    withdrawListing: (id: string) => apiRequest<Listing>(
        `/listings/${encodeURIComponent(id)}/withdraw`, { method: "POST" }
    ),
    resetReservation: (id: string) => apiRequest<Listing>(
        `/listings/${encodeURIComponent(id)}/reset-reservation`, { method: "POST" }
    ),
    // The backend assigns the requester and checks current availability.
    createRequest: (input: PickupRequest) => apiRequest<PickupRequest>("/requests", {
        method: "POST", body: jsonBody({
            listing_id: input.listingId,
            message: input.message,
            pickup_at: input.pickup_at ?? null,
            pickup_location: input.location
        })
    }),
    // Use the returned statuses rather than marking a handover complete locally.
    confirmHandover: (id: string) => apiRequest<{ request: PickupRequest; listing: Listing }>(
        `/requests/${encodeURIComponent(id)}/confirm-handover`, { method: "POST" }
    ),
    getReuseMetrics: () => apiRequest<Record<"Exchange" | "Donation" | "Affordable Resale" | "Recyclable", number>>(
        "/metrics/reuse"
    ),
    getSaved: () => apiRequest<string[]>("/me/saved"),
    setSaved: (id: string, saved: boolean) => apiRequest<void>(`/me/saved/${encodeURIComponent(id)}`, {
        method: saved ? "POST" : "DELETE"
    }),
    getThreads: () => apiRequest<Thread[]>("/threads"),
    sendMessage: (threadId: string, text: string) => apiRequest<Thread>(
        `/threads/${encodeURIComponent(threadId)}/messages`, { method: "POST", body: jsonBody({ text }) }
    ),
    readThread: (id: string) => apiRequest<void>(`/threads/${encodeURIComponent(id)}/read`, { method: "POST" }),
    offerWanted: (wantedId: string, listingId: string, message: string) => apiRequest<Thread>(
        `/wanted/${encodeURIComponent(wantedId)}/offers`, {
            method: "POST", body: jsonBody({ listing_id: listingId, message })
        }
    ),
    getWanted: () => apiRequest<Wanted[]>("/wanted"),
    createWanted: (input: Wanted) => apiRequest<Wanted>("/wanted", {
        method: "POST", body: jsonBody(input)
    }),
    beginVerification: (email: string) => apiRequest<void>("/auth/otp/request", {
        method: "POST", body: jsonBody({ email })
    }),
    verifyEmail: (email: string, code: string) => apiRequest<Profile>("/auth/otp/verify", {
        method: "POST", body: jsonBody({ email, code })
    }),
    logout: () => apiRequest<void>("/auth/logout", { method: "POST" })
};
