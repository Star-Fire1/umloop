"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Heart, Search } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Chip, Empty, ItemRow, PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Show saved listings using the IDs held in the store.
// Show listings saved by the current student.
export function WishlistScreen() {
    const { listings, saved } = useMarket();
    const [kind, setKind] = useState("All saved");
    // Use saved IDs and the selected listing type to build this list.
    const items = listings.filter(l => saved.includes(l.id) && (kind === 'All saved' || (kind === 'Donate' ? l.type === 'donate' : l.type === 'sell')));
    return <Shell
        title="Wishlist"
        back="/profile"
        action={<Link href="/explore" className="header-round" aria-label="Search items">
            <Search size={20} />
        </Link>}
    >
        <PageIntro title="Keep a little possibility." subtitle={`${saved.length} saved finds · Only visible to you`} />
        {/* Switch between all saved items, sale items and donations. */}
        <div className="chip-row wishlist-filters">
            {["All saved", "Buy", "Donate"].map(k => <Chip active={kind === k} onClick={() => setKind(k)} key={k}>
                {k}
            </Chip>)}
        </div>
        {/* Show the empty state if none of the saved items match. */}
        {items.length ? <div className="wishlist-list">
            {items.map(l => <ItemRow key={l.id} item={l} showRemove />)}
        </div> : <Empty
            icon={Heart}
            title="Nothing saved yet"
            subtitle="Tap the heart on a listing to keep it here."
            action={<Link className="primary-button" href="/explore">Explore finds <ArrowRight size={18} /></Link>}
        />}
    </Shell>
}
