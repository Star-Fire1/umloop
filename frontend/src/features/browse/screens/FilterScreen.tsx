"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, MapPin, SlidersHorizontal, X, SortAsc } from "lucide-react";
import { type Category } from "@/lib/data";
import { Chip, Field, PrimaryButton, Shell } from "@/components/ui/MarketplaceUI";
import { CATEGORIES, defaultFilters, filterKey, loadFilters, type FilterState } from "../shared";

// Edit the filters used on the Explore page.
export function FilterScreen() {
    const router = useRouter();
    const [f, setF] = useState<FilterState>(defaultFilters);
    useEffect(() => setF(loadFilters()), []);
    // Merge each changed control into the current filter state.
    const change = (patch: Partial<FilterState>) => setF(p => ({ ...p, ...patch }));
    // Store the selection for Explore, then return to the results.
    const apply = () => {
        sessionStorage.setItem(filterKey, JSON.stringify(f));
        router.push('/explore')
    };
    return <Shell
        title="Filter & sort"
        back="/explore"
        action={<button className="header-round" onClick={() => router.push('/explore')} aria-label="Close">
            <X size={22} />
        </button>}
        fixedAction={<PrimaryButton onClick={apply}>Show matching finds <SlidersHorizontal size={18} /></PrimaryButton>}
    >
        {/* Clear resets all choices to the default filters. */}
        <div className="filter-top">
            <span>For “study essentials”</span>
            <button className="text-link" onClick={() => change(defaultFilters)}>Clear all</button>
        </div>
        {/* Start with the listing type filter. */}
        <div className="filter-section">
            <h3>Looking to...</h3>
            <div className="chip-row">
                <Chip active={f.buying} onClick={() => change({ buying: !f.buying })}>{f.buying && <Check size={15} />} Buy</Chip>
                <Chip active={f.donating} onClick={() => change({ donating: !f.donating })}>{f.donating && <Check size={15} />} Donate</Chip>
            </div>
            <p>Include items for sale and free donations.</p>
        </div>
        <div className="filter-section">
            <h3>Category</h3>
            <div className="chip-row">
                {CATEGORIES.map(c => <Chip key={c} active={f.category === c} onClick={() => change({ category: c })}>
                    {c}
                </Chip>)}
            </div>
        </div>
        <div className="filter-section">
            <h3>Price range</h3>
            <div className="filter-minmax">
                <Field label="Minimum (RM)">
                    <input
                        type="number"
                        min="0"
                        value={f.min}
                        onChange={e => change({ min: Math.max(0, Number(e.target.value)) })}
                    />
                </Field>
                <Field label="Maximum (RM)">
                    <input
                        type="number"
                        min="0"
                        value={f.max}
                        onChange={e => change({ max: Math.max(0, Number(e.target.value)) })}
                    />
                </Field>
            </div>
            {/* Keep the slider tied to the maximum price. */}
            <div className="range-stack">
                <input
                    type="range"
                    min="0"
                    max="200"
                    value={f.max}
                    onChange={e => change({ max: Number(e.target.value) })}
                    aria-label="Maximum price"
                />
            </div>
        </div>
        <div className="filter-section">
            <h3>Condition</h3>
            <div className="chip-row">
                {["Any", "Like new", "Good"].map(x => <Chip key={x} active={f.condition === x} onClick={() => change({ condition: x })}>
                    {x}
                </Chip>)}
            </div>
        </div>
        <div className="filter-section">
            <Field label="Campus pickup">
                <div className="input-icon">
                    <MapPin size={19} />
                    <select value={f.pickup} onChange={e => change({ pickup: e.target.value })}>
                        <option>Anywhere on UM campus</option>
                        <option>Central Library</option>
                        <option>Faculty of Science</option>
                        <option>Student Union</option>
                    </select>
                </div>
                <small>Public pickup spots only · No live location shared.</small>
            </Field>
        </div>
        <div className="filter-section">
            <Field label="Sort by">
                <div className="input-icon">
                    <SortAsc size={19} />
                    <select value={f.sort} onChange={e => change({ sort: e.target.value })}>
                        {["Best match", "Newest", "Lowest price", "Highest price"].map(x => <option key={x}>
                            {x}
                        </option>)}
                    </select>
                </div>
            </Field>
        </div>
        <label className="check-line"><input type="checkbox" checked={f.priority} onChange={e => change({ priority: e.target.checked })} />Prioritise Central Library pickup</label>
    </Shell>
}
