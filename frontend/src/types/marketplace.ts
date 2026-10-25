export type Category = "Books" | "Tech" | "Fashion" | "Dorm";
export type ReuseCategory = "Exchange" | "Donation" | "Affordable Resale" | "Recyclable";
// Use the same status strings as the backend database.
export type ListingStatus = "Available" | "Reserved" | "Completed" | "Removed";
export type RequestStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";

// Fields expected for each marketplace listing.
export type Listing = {
    id: string;
    title: string;
    price: number;
    type: "sell" | "donate";
    category: Category;
    condition: "Like new" | "Good";
    image: string;
    images?: string[];
    seller: string;
    location: string;
    description: string;
    tagline: string;
    faculty?: string;
    owner?: boolean;
    owner_email?: string;
    status: ListingStatus;
    reuse_category: ReuseCategory;
    is_test: boolean;
    is_paused?: boolean;
};

// Public fields for a community wanted post.
export type Wanted = {
    id: string;
    title: string;
    category: Category;
    requester: string;
    faculty: string;
    year: string;
    budget: number;
    donation: boolean;
    description: string;
    posted: string;
};
// Chat messages are attached to a listing thread.
export type Message = { id: string; byMe: boolean; text: string; time: string };
export type Thread = {
    id: string;
    person: string;
    listingId: string;
    messages: Message[];
    unread: number;
    accepted?: boolean;
};
// A request keeps both pickup details and confirmation flags.
export type PickupRequest = {
    id: string;
    listingId: string;
    person: string;
    requester_email: string;
    message: string;
    date: string;
    pickup_at?: string | null;
    location: string;
    request_status: RequestStatus;
    is_test: boolean;
    confirmed_by_requester?: boolean;
    confirmed_by_owner?: boolean;
};
// Account details shown or edited in profile screens.
export type Profile = {
    name: string;
    email: string;
    faculty: string;
    year: string;
    pickup: string;
    verified: boolean;
    loggedIn: boolean;
};
// Local appearance and notification preferences.
export type Settings = {
    theme: "light" | "dark" | "system";
    notifyMessages: boolean;
    notifyRequests: boolean;
    notifyPickup: boolean;
};
