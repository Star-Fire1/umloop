import assert from "node:assert/strict";
import test from "node:test";
import {
    UM_EMAIL_PATTERN,
    canRequestItem,
    canPostItem,
    acceptRequest,
    confirmHandover,
    completedReuseCounts
} from "../src/lib/domain/marketplace.ts";

const profile = {
    name: "A UM student", email: "student@siswa.um.edu.my",
    faculty: "Science", year: "Year 2", pickup: "Library", verified: true, loggedIn: true
};
const listing = {
    id: "1", title: "Book", price: 5, type: "sell", category: "Books", condition: "Good",
    image: "", seller: "Another UM student", location: "Library", description: "", tagline: "",
    status: "Available", reuse_category: "Affordable Resale", is_test: false,
    owner_email: "other@siswa.um.edu.my"
};
const request = {
    id: "r1", listingId: "1", person: "Owner", requester_email: profile.email,
    message: "Can I collect it?", date: "Tomorrow", location: "Library",
    request_status: "Pending", is_test: false
};

test("only valid verified students can post or request", () => {
    assert.ok(UM_EMAIL_PATTERN.test(profile.email));
    assert.equal(canPostItem(profile), true);
    assert.equal(canRequestItem(profile, listing, []), null);
    assert.ok(canRequestItem({ ...profile, loggedIn: false }, listing, []));
    assert.ok(canRequestItem({ ...profile, verified: false }, listing, []));
    assert.ok(canRequestItem({ ...profile, email: "student@gmail.com" }, listing, []));
});

test("request rules block unavailable listings, self requests, and duplicates", () => {
    assert.ok(canRequestItem(profile, { ...listing, status: "Reserved" }, []));
    assert.ok(canRequestItem(profile, { ...listing, status: "Removed" }, []));
    assert.ok(canRequestItem(profile, { ...listing, status: "Completed" }, []));
    assert.ok(canRequestItem(profile, { ...listing, owner_email: profile.email }, []));
    assert.ok(canRequestItem(profile, { ...listing, owner: true }, []));
    assert.ok(canRequestItem(profile, listing, [request]));
    assert.equal(canRequestItem(profile, listing, [{ ...request, request_status: "Rejected" }]), null);
});

// A single handover confirmation must not complete the request.
test("acceptance reserves the listing; both parties must confirm completion", () => {
    const accepted = acceptRequest(listing, request);
    assert.equal(accepted.listing.status, "Reserved");
    assert.equal(accepted.request.request_status, "Accepted");
    assert.throws(() => acceptRequest(accepted.listing, request));
    const first = confirmHandover(accepted.listing, accepted.request, "requester");
    assert.equal(first.request.request_status, "Accepted");
    assert.equal(first.listing.status, "Reserved");
    const second = confirmHandover(first.listing, first.request, "owner");
    assert.equal(second.request.request_status, "Completed");
    assert.equal(second.listing.status, "Completed");
});

test("reuse metrics exclude test and incomplete records and group by reuse category", () => {
    const entries = [
        { ...listing, status: "Completed", reuse_category: "Donation" },
        { ...listing, status: "Completed", is_test: true, reuse_category: "Donation" },
        { ...listing, status: "Reserved", reuse_category: "Exchange" },
        { ...listing, status: "Completed", reuse_category: "Affordable Resale" }
    ];
    assert.deepEqual(completedReuseCounts(entries), {
        Exchange: 0, Donation: 1, "Affordable Resale": 1, Recyclable: 0
    });
});
