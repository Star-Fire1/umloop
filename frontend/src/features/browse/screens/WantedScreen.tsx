"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Search, Plus } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Avatar, Chip, PageIntro, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Browse items other students are looking for.
export function WantedScreen() {
    const { wanted } = useMarket();
    const [cat, setCat] = useState("All needs");
    const [newest, setNewest] = useState(true);
    // Filter requests by the selected category.
    const filtered = wanted.filter(w => cat === 'All needs' || w.category === cat);
    return <Shell
        title="Community · Wanted"
        back="/profile"
        action={<Link href="/explore" className="header-round" aria-label="Search">
            <Search size={21} />
        </Link>}
        fixedAction={<Link className="primary-button" href="/wanted/new">Post a request <Plus size={21} /></Link>}
    >
        <PageIntro title="Someone’s spare. Someone’s need." subtitle="Ask the UM community for something you need — or help a fellow student find it." />
        <div className="chip-row wanted-tabs">
            {["All needs", "Books", "Dorm", "Tech"].map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
            </Chip>)}
        </div>
        {/* Change the display order without changing the original list. */}
        <div className="wanted-summary">
            <span>{filtered.length} open requests · UM</span>
            <button onClick={() => setNewest(n => !n)} className="text-link">
                {newest ? "Newest ↓" : "Oldest ↑"}
            </button>
        </div>
        {/* Each request can open an offer form. */}
        <div className="wanted-list">
            {(newest ? filtered : [...filtered].reverse()).map(w => <article className="wanted-card" key={w.id}>
                <div className="wanted-person">
                    <Avatar name={w.requester} />
                    <div>
                        <strong>{w.requester} · Verified UM <Check size={13} /></strong>
                        <small>{w.faculty} · {w.year}</small>
                    </div>
                    <time>
                        {w.posted}
                    </time>
                </div>
                <h3>
                    {w.title}
                </h3>
                <p>
                    {w.description}
                </p>
                <div className="wanted-badges">
                    <span className="chip">
                        {w.category}
                    </span>
                    <b>
                        {w.budget ? `Up to RM ${w.budget}` : "Open to donation"}
                    </b>
                </div>
                <div className="wanted-card-footer">
                    <span>Public campus pickup</span>
                    <Link href={`/offer/${w.id}`}>Offer an item <ArrowRight size={15} /></Link>
                </div>
            </article>)}
        </div>
    </Shell>
}
