"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Layers3, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money } from "@/lib/data";
import { CheckedBadge, Shell } from "@/components/ui/MarketplaceUI";

// Confirm which listing was just published.
export function SellSuccessScreen() {
    const { listings } = useMarket();
    // Read the last published item from the browser session.
    const [id, setId] = useState("desk");
    useEffect(() => {
        setId(sessionStorage.getItem('umloop-last-listing') || 'desk')
    }, []);
    // Fall back to a sample listing when the saved ID is unavailable.
    const item = listings.find(l => l.id === id) || listings.find(l => l.id === 'desk') || listings[0];
    return <Shell
        title="Your next good loop"
        back="/activity"
        action={<Link href="/home" className="header-round">
            <X size={20} />
        </Link>}
    >
        {/* Show the posted item with follow-up links. */}
        <div className="success-content">
            <div className="success-icon">
                <Check size={30} />
            </div>
            <h1>You’re in the loop!</h1>
            <p>Your {item.title.toLowerCase()} is ready for its next chapter. Fellow students can now request it.</p>
            <div className="success-item white-card">
                <img src={item.image} alt={item.title} />
                <div>
                    <CheckedBadge>Active listing</CheckedBadge>
                    <b>
                        {money(item.price)}
                    </b>
                </div>
                <h3>
                    {item.title}
                </h3>
                <small>{item.seller} · {item.condition} condition · {item.location}</small>
            </div>
            <Link className="primary-button" href={`/item/${item.id}`}>View listing <ArrowRight size={19} /></Link>
            <Link className="secondary-button" href="/activity">Manage my listings <Layers3 size={19} /></Link>
            <Link className="text-link" href="/home">Return Home</Link>

        </div>
    </Shell>
}
