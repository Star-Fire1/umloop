"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initialRequests, initialThreads, listings as sampleListings, wantedRequests } from "@/mocks/fixtures";
import { marketplaceApi } from "@/lib/api/marketplace";
import { ApiError, useApi } from "@/lib/api/http";
import { canPostItem, canRequestItem, confirmHandover, UM_EMAIL_PATTERN } from "@/lib/domain/marketplace";
import type { Listing, PickupRequest, Profile, Settings, Thread, Wanted } from "@/types/marketplace";

// Data shared between the marketplace screens.
type MarketState = {
    profile: Profile;
    settings: Settings;
    listings: Listing[];
    wanted: Wanted[];
    saved: string[];
    threads: Thread[];
    requests: PickupRequest[];
    paused: string[];
};

// Shared data plus the actions screens can call.
type MarketStore = MarketState & {
    ready: boolean;
    toast: string;
    clearToast: () => void;
    inform: (message: string) => void;
    beginVerification: (email: string) => Promise<boolean>;
    verifyEmail: (code: string) => Promise<boolean>;
    logout: () => Promise<boolean>;
    updateProfile: (data: Partial<Profile>) => Promise<boolean>;
    updateSettings: (data: Partial<Settings>) => void;
    toggleSaved: (id: string) => Promise<void>;
    addListing: (listing: Listing) => Promise<Listing | null>;
    updateListing: (id: string, data: Partial<Listing>) => Promise<boolean>;
    pauseListing: (id: string) => Promise<void>;
    addWanted: (wanted: Wanted) => Promise<boolean>;
    ensureThread: (listingId: string, initialText?: string) => string;
    ensureWantedThread: (wantedId: string, listingId: string, message: string) => Promise<string>;
    sendMessage: (threadId: string, text: string) => Promise<boolean>;
    readThread: (threadId: string) => void;
    addRequest: (request: PickupRequest) => Promise<PickupRequest | null>;
    completeRequest: (id: string) => Promise<boolean>;
};

const sampleProfile: Profile = {
    name: "Chen Bingyan",
    email: "24078302@siswa.um.edu.my",
    faculty: "Faculty of Science",
    year: "Year 2",
    pickup: "Central Library · public entrance",
    verified: true,
    loggedIn: false
};

// Mock mode loads sample records; API mode starts with empty lists.
const defaults: MarketState = {
    profile: useApi ? { ...sampleProfile, name: "UM student", email: "", verified: false } : sampleProfile,
    settings: { theme: "light", notifyMessages: true, notifyRequests: true, notifyPickup: true },
    listings: useApi ? [] : sampleListings,
    wanted: useApi ? [] : wantedRequests,
    saved: useApi ? [] : ["calculus", "lamp", "ikea-lamp", "backpack"],
    threads: useApi ? [] : initialThreads,
    requests: useApi ? [] : initialRequests,
    paused: []
};

// Only the mock store uses this browser key.
const STORAGE_KEY = "umloop-frontend-mock-v2";
const MarketContext = createContext<MarketStore | null>(null);

function errorText(error: unknown): string {
    return error instanceof ApiError || error instanceof Error ? error.message : "The action could not be completed.";
}

export function MarketProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<MarketState>(defaults);
    const [ready, setReady] = useState(false);
    const [toast, setToast] = useState("");

    // Restore local demo changes, or fetch initial data from the backend.
    useEffect(() => {
        let active = true;
        async function load() {
            if (!useApi) {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (raw) {
                        const saved = JSON.parse(raw) as Partial<MarketState>;
                        if (active) setState(previous => ({
                            ...previous, ...saved,
                            profile: { ...previous.profile, ...saved.profile },
                            settings: { ...previous.settings, ...saved.settings }
                        }));
                    }
                } catch {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } else {
                const [listings, wanted, profile] = await Promise.allSettled([
                    marketplaceApi.getListings(), marketplaceApi.getWanted(), marketplaceApi.getProfile()
                ]);
                if (!active) return;
                setState(previous => ({
                    ...previous,
                    listings: listings.status === "fulfilled" ? listings.value : [],
                    wanted: wanted.status === "fulfilled" ? wanted.value : [],
                    profile: profile.status === "fulfilled"
                        ? profile.value
                        : { ...previous.profile, loggedIn: false, verified: false }
                }));
                if (profile.status === "fulfilled") {
                    const [requests, saved, threads] = await Promise.allSettled([
                        marketplaceApi.getRequests(), marketplaceApi.getSaved(), marketplaceApi.getThreads()
                    ]);
                    if (!active) return;
                    setState(previous => ({
                        ...previous,
                        requests: requests.status === "fulfilled" ? requests.value : [],
                        saved: saved.status === "fulfilled" ? saved.value : [],
                        threads: threads.status === "fulfilled" ? threads.value : []
                    }));
                }
                if (listings.status === "rejected") {
                    setToast("Could not load listings from the backend.");
                }
            }
            if (active) setReady(true);
        }
        void load();
        return () => { active = false; };
    }, []);

    // Save mock changes in this browser after the initial load.
    useEffect(() => {
        if (ready && !useApi) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [ready, state]);

    // Clear temporary messages after a short delay.
    useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(""), 3500);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    // Apply the chosen theme to the document.
    useEffect(() => {
        document.documentElement.dataset.theme = state.settings.theme === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : state.settings.theme;
    }, [state.settings.theme]);

    const fail = (error: unknown) => { setToast(errorText(error)); };

    // Check the student email before starting verification.
    const beginVerification = async (email: string) => {
        const normalised = email.trim().toLowerCase();
        if (!UM_EMAIL_PATTERN.test(normalised)) {
            setToast("Please use your @siswa.um.edu.my student email.");
            return false;
        }
        try {
            if (useApi) await marketplaceApi.beginVerification(normalised);
            setState(previous => ({ ...previous, profile: { ...previous.profile, email: normalised, verified: false, loggedIn: false } }));
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Refresh private records after verification in API mode.
    const verifyEmail = async (code: string) => {
        try {
            if (useApi) {
                const profile = await marketplaceApi.verifyEmail(state.profile.email, code);
                const [listings, requests, saved, threads, wanted] = await Promise.allSettled([
                    marketplaceApi.getListings(), marketplaceApi.getRequests(),
                    marketplaceApi.getSaved(), marketplaceApi.getThreads(), marketplaceApi.getWanted()
                ]);
                setState(previous => ({
                    ...previous,
                    profile,
                    listings: listings.status === "fulfilled" ? listings.value : previous.listings,
                    requests: requests.status === "fulfilled" ? requests.value : [],
                    saved: saved.status === "fulfilled" ? saved.value : [],
                    threads: threads.status === "fulfilled" ? threads.value : [],
                    wanted: wanted.status === "fulfilled" ? wanted.value : previous.wanted
                }));
            } else {
                if (code !== "248610") throw new Error("Enter the demo code 248610.");
                setState(previous => ({ ...previous, profile: { ...previous.profile, verified: true, loggedIn: true } }));
            }
            return true;
        } catch (error) { fail(error); return false; }
    };

    const logout = async () => {
        try {
            if (useApi) await marketplaceApi.logout();
            setState(previous => ({
                ...previous,
                profile: { ...previous.profile, email: useApi ? "" : previous.profile.email, loggedIn: false, verified: false },
                saved: useApi ? [] : previous.saved,
                requests: useApi ? [] : previous.requests,
                threads: useApi ? [] : previous.threads,
                listings: useApi ? [] : previous.listings
            }));
            if (useApi) {
                const listings = await marketplaceApi.getListings();
                setState(previous => ({ ...previous, listings }));
            }
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Save profile edits in the API or mock store.
    const updateProfile = async (data: Partial<Profile>) => {
        try {
            const profile = useApi
                ? await marketplaceApi.updateProfile({ name: data.name, faculty: data.faculty, year: data.year, pickup: data.pickup })
                : { ...state.profile, ...data };
            setState(previous => ({ ...previous, profile }));
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Keep notification and appearance choices in state.
    const updateSettings = (data: Partial<Settings>) => {
        setState(previous => ({ ...previous, settings: { ...previous.settings, ...data } }));
    };

    // Wait for the API before updating the saved-list state.
    const toggleSaved = async (id: string) => {
        const shouldSave = !state.saved.includes(id);
        try {
            if (useApi) await marketplaceApi.setSaved(id, shouldSave);
            setState(previous => ({
                ...previous,
                saved: shouldSave ? [...new Set([...previous.saved, id])] : previous.saved.filter(value => value !== id)
            }));
        } catch (error) { fail(error); }
    };

    // Use the stored listing returned by the backend when available.
    const addListing = async (listing: Listing): Promise<Listing | null> => {
        if (!canPostItem(state.profile)) {
            setToast("Sign in with a verified UM student email to post items.");
            return null;
        }
        try {
            const created = useApi ? await marketplaceApi.createListing(listing) : {
                ...listing,
                status: "Available" as const,
                reuse_category: listing.type === "donate" ? "Donation" as const : "Affordable Resale" as const,
                is_test: true,
                owner: true,
                owner_email: state.profile.email
            };
            setState(previous => ({ ...previous, listings: [created, ...previous.listings] }));
            return created;
        } catch (error) { fail(error); return null; }
    };

    // Only owners can edit their listing.
    const updateListing = async (id: string, data: Partial<Listing>) => {
        if (!canPostItem(state.profile)) {
            setToast("Sign in with a verified UM student email to edit listings.");
            return false;
        }
        const listing = state.listings.find(item => item.id === id);
        if (!listing?.owner) { setToast("Only the owner can edit this listing."); return false; }
        try {
            const changed = useApi ? await marketplaceApi.updateListing(id, data) : { ...listing, ...data };
            setState(previous => ({ ...previous, listings: previous.listings.map(item => item.id === id ? changed : item) }));
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Pause a listing without removing its record.
    const pauseListing = async (id: string) => {
        const listing = state.listings.find(item => item.id === id);
        if (!listing?.owner) { setToast("Only the owner can manage a listing."); return; }
        try {
            const is_paused = !listing.is_paused;
            const changed = useApi
                ? await marketplaceApi.updateListing(id, { is_paused })
                : { ...listing, is_paused };
            setState(previous => ({
                ...previous,
                listings: previous.listings.map(item => item.id === id ? changed : item),
                paused: is_paused ? [...previous.paused, id] : previous.paused.filter(value => value !== id)
            }));
        } catch (error) { fail(error); }
    };

    // Save a community request through the active data source.
    const addWanted = async (wanted: Wanted) => {
        if (!canPostItem(state.profile)) { setToast("Sign in with your verified UM student email."); return false; }
        try {
            const created = useApi ? await marketplaceApi.createWanted(wanted) : wanted;
            setState(previous => ({ ...previous, wanted: [created, ...previous.wanted] }));
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Use the server thread in API mode; append locally in mock mode.
    const sendMessage = async (threadId: string, text: string) => {
        if (!text.trim()) return false;
        try {
            if (useApi) {
                const thread = await marketplaceApi.sendMessage(threadId, text.trim());
                setState(previous => ({
                    ...previous,
                    threads: previous.threads.map(existing => existing.id === threadId ? thread : existing)
                }));
            } else {
                setState(previous => ({
                    ...previous,
                    threads: previous.threads.map(thread => thread.id === threadId ? {
                        ...thread,
                        messages: [...thread.messages, { id: `m-${crypto.randomUUID()}`, text: text.trim(), byMe: true, time: "Just now" }]
                    } : thread)
                }));
            }
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Only mock mode can create a chat without a backend response.
    const ensureThread = (listingId: string, initialText?: string) => {
        const previous = state.threads.find(thread => thread.listingId === listingId);
        if (previous) {
            if (initialText) void sendMessage(previous.id, initialText);
            return previous.id;
        }
        // The backend creates conversations from requests; never invent a remote thread.
        if (useApi) return "";
        const listing = state.listings.find(item => item.id === listingId);
        const id = `chat-${listingId}`;
        const thread: Thread = {
            id,
            person: listing?.seller || "UM student",
            listingId,
            unread: 0,
            messages: initialText ? [{ id: `m-${crypto.randomUUID()}`, text: initialText, byMe: true, time: "Just now" }] : []
        };
        setState(previous => ({ ...previous, threads: [thread, ...previous.threads] }));
        return id;
    };

    // Open an offer conversation for a wanted post.
    const ensureWantedThread = async (wantedId: string, listingId: string, message: string) => {
        try {
            if (useApi) {
                const thread = await marketplaceApi.offerWanted(wantedId, listingId, message);
                setState(previous => ({ ...previous, threads: [thread, ...previous.threads.filter(item => item.id !== thread.id)] }));
                return thread.id;
            }
            const id = `offer-${wantedId}`;
            const existing = state.threads.find(thread => thread.id === id);
            if (existing) { await sendMessage(id, message); return id; }
            const target = state.wanted.find(item => item.id === wantedId);
            const thread: Thread = {
                id,
                person: target?.requester || "UM student",
                listingId,
                unread: 0,
                messages: [{ id: `m-${crypto.randomUUID()}`, text: message, byMe: true, time: "Just now" }]
            };
            setState(previous => ({ ...previous, threads: [thread, ...previous.threads] }));
            return id;
        } catch (error) { fail(error); return ""; }
    };

    // Clear unread messages locally and notify the backend in API mode.
    const readThread = (threadId: string) => {
        setState(previous => ({
            ...previous,
            threads: previous.threads.map(thread => thread.id === threadId ? { ...thread, unread: 0 } : thread)
        }));
        if (useApi) void marketplaceApi.readThread(threadId).catch(fail);
    };

    // Check local eligibility before asking the backend to save a request.
    const addRequest = async (request: PickupRequest): Promise<PickupRequest | null> => {
        const listing = state.listings.find(item => item.id === request.listingId);
        if (!listing) { setToast("This listing no longer exists."); return null; }
        const validation = canRequestItem(state.profile, listing, state.requests);
        if (validation) { setToast(validation); return null; }
        try {
            const created = useApi ? await marketplaceApi.createRequest(request) : {
                ...request,
                request_status: "Pending" as const,
                requester_email: state.profile.email,
                is_test: true
            };
            setState(previous => ({ ...previous, requests: [created, ...previous.requests] }));
            if (useApi) {
                marketplaceApi.getThreads().then(threads => setState(previous => ({ ...previous, threads }))).catch(fail);
            }
            return created;
        } catch (error) { fail(error); return null; }
    };

    // A confirmation may leave the request accepted until the other student confirms.
    const completeRequest = async (id: string) => {
        const request = state.requests.find(item => item.id === id);
        const listing = state.listings.find(item => item.id === request?.listingId);
        if (!request || !listing) { setToast("Request not found."); return false; }
        try {
            const result = useApi
                ? await marketplaceApi.confirmHandover(id)
                : confirmHandover(listing, request, "requester");
            setState(previous => ({
                ...previous,
                listings: previous.listings.map(item => item.id === result.listing.id ? result.listing : item),
                requests: previous.requests.map(item => item.id === id ? result.request : item)
            }));
            if (result.request.request_status !== "Completed") {
                setToast("Your confirmation was recorded. Waiting for the other student.");
            }
            return true;
        } catch (error) { fail(error); return false; }
    };

    // Expose the current records and actions to all screens.
    return <MarketContext.Provider value={{
        ...state,
        ready,
        toast,
        clearToast: () => setToast(""),
        inform: setToast,
        beginVerification,
        verifyEmail,
        logout,
        updateProfile,
        updateSettings,
        toggleSaved,
        addListing,
        updateListing,
        pauseListing,
        addWanted,
        ensureThread,
        ensureWantedThread,
        sendMessage,
        readThread,
        addRequest,
        completeRequest
    }}>
        {children}
    </MarketContext.Provider>;
}

// Screens use this hook instead of calling the API themselves.
export function useMarket(): MarketStore {
    const context = useContext(MarketContext);
    if (!context) throw new Error("MarketProvider is missing.");
    return context;
}
