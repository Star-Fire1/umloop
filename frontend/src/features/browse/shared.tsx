"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export const CATEGORIES = ["All", "Books", "Tech", "Fashion", "Dorm"] as const;

export type FilterState = {
    buying: boolean;
    donating: boolean;
    category: string;
    min: number;
    max: number;
    condition: string;
    pickup: string;
    sort: string;
    priority: boolean
};

// Starting choices for the Explore filters.
export const defaultFilters: FilterState = {
    buying: true,
    donating: true,
    category: "All",
    min: 0,
    max: 100,
    condition: "Any",
    pickup: "Anywhere on UM campus",
    sort: "Best match",
    priority: true
};

export const filterKey = "umloop-search-filters";

// Keep filter choices while moving between Explore and Filter.
export function loadFilters(): FilterState {
    if (typeof window === "undefined") return defaultFilters;
    try {
        return { ...defaultFilters, ...JSON.parse(sessionStorage.getItem(filterKey) || "{}") };
    } catch {
        return defaultFilters;
    }
}

export function HomeSearch({ desktop = false }: { desktop?: boolean }) {
    const router = useRouter();
    const [value, setValue] = useState("");

    // Pass the search text to Explore through the URL.
    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = value.trim();
        router.push(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
    };

    return <form
        role="search"
        className={`header-search ${desktop ? "home-desktop-search" : ""}`}
        onSubmit={submit}
    >
        <button type="submit" aria-label="Search listings">
            <Search size={19} />
        </button>
        <input
            type="search"
            value={value}
            onChange={event => setValue(event.target.value)}
            aria-label="Search campus listings"
            placeholder=""
        />
    </form>;
}
