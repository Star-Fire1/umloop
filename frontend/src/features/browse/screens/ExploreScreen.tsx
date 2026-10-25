"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Chip, Empty, ItemCard, SecondaryButton, Shell } from "@/components/ui/MarketplaceUI";
import { CATEGORIES, defaultFilters, filterKey, loadFilters, type FilterState } from "../shared";

// Search, filter and sort the campus listings.
export function ExploreScreen() {
    const router = useRouter();
    const { listings, paused } = useMarket();
    // Keep the search and filter selections on this screen.
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<string>("All");
    const [kind, setKind] = useState("All finds");
    const [filters, setFilters] = useState<FilterState>(defaultFilters);

    // Read saved filters and search terms when Explore opens.
    useEffect(() => {
        const f = loadFilters();
        setFilters(f);
        setCategory(f.category);
        const query = new URLSearchParams(window.location.search);
        if (query.get('type') === 'donate') setKind('Donate');
        if (query.get('type') === 'sell') setKind('Buy');
        // Keep the search term when moving from Home to Explore.
        setSearch(query.get('q') || '');
    }, []);

    // Apply the current search, filters and sort order.
    const results = useMemo(() => {
        let r = listings.filter(l => l.status === "Available" && !l.is_paused && !paused.includes(l.id))
            .filter(l => `${l.title} ${l.description} ${l.seller} ${l.category}`.toLowerCase().includes(search.toLowerCase()))
            .filter(l => category === 'All' || l.category === category)
            .filter(l => kind === 'All finds' || kind === 'Wanted' || (kind === 'Donate' ? l.type === 'donate' : l.type === 'sell'))
            .filter(l => l.price >= filters.min && l.price <= filters.max)
            .filter(l => (filters.buying && l.type === 'sell') || (filters.donating && l.type === 'donate'))
            .filter(l => filters.condition === 'Any' || l.condition === filters.condition);
        if (filters.sort === 'Lowest price') r.sort((a, b) => a.price - b.price);
        if (filters.sort === 'Highest price') r.sort((a, b) => b.price - a.price);
        if (filters.sort === 'Newest') r.reverse();
        if (filters.priority) r.sort((a, b) => Number(b.location === 'Central Library') - Number(a.location === 'Central Library'));
        if (filters.pickup !== 'Anywhere on UM campus') r = r.filter(l => l.location.toLowerCase().includes(filters.pickup.toLowerCase()));
        return r;
    }, [listings, paused, search, category, kind, filters]);

    return <Shell
        title="Explore"
        current="/explore"
        kind="brand"
        action={<Link href="/wishlist" className="header-round" aria-label="Open wishlist">
            <Heart size={23} />
        </Link>}
    >
        {/* Search updates the visible results without leaving the page. */}
        <div className="explore-search">
            <Search size={21} />
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search books, tech, fashion & dorm"
                aria-label="Search listings"
            />
            {search ? <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={20} />
            </button> : null}
        </div>
        {/* Category chips narrow the result list. */}
        <div className="chip-row categories-row">
            {CATEGORIES.map(c => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
            </Chip>)}
        </div>
        <div className="explore-heading">
            <div>
                <h1>Explore categories</h1>
                <p>Browse books, tech, fashion &amp; dorm finds · Universiti Malaya</p>
            </div>
            <Link href="/filter" className="filter-link" aria-label="Filter and sort">
                <SlidersHorizontal size={21} />
            </Link>
        </div>
        {/* Use separate choices for buying and donations. */}
        <div className="chip-row explore-kinds">
            {["All finds", "Buy", "Donate", "Wanted"].map(k => <Chip
                key={k}
                active={kind === k}
                onClick={() => {
                    setKind(k);
                    if (k === 'Wanted') router.push('/wanted')
                }}
            >
                {k}
            </Chip>)}
        </div>
        <div className="listing-count">{results.length} finds on campus</div>
        {results.length ? <div className="items-grid">
            {results.map(l => <ItemCard item={l} key={l.id} />)}
        </div> : <Empty
            icon={Search}
            title="No finds yet"
            subtitle="Try another keyword or loosen your filters."
            action={<SecondaryButton onClick={() => {
                setSearch("");
                setCategory("All");
                setFilters(defaultFilters);
                sessionStorage.removeItem(filterKey)
            }}>Clear filters</SecondaryButton>}
        />}
    </Shell>
}
