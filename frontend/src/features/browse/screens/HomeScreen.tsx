"use client";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, MessageCircle, UserRound } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money } from "@/lib/data";
import { Favorite, ItemCard, SectionTitle, Shell } from "@/components/ui/MarketplaceUI";
import { HomeSearch } from "../shared";

// Build the home feed from active campus listings.
export function HomeScreen() {
    const { listings } = useMarket();
    // Only show listings that students can request.
    const active = listings.filter(l => l.status === "Available" && !l.is_paused);
    // Use a sample featured item when present, otherwise use the first active listing.
    const featured = active.find(x => x.id === "calculus") || active[0];
    return <Shell
        title="Home"
        current="/home"
        kind="brand"
        className="home-screen"
        action={<div className="home-header-actions">
            <HomeSearch />
            <Link href="/wishlist" aria-label="Wishlist">
                <Heart size={23} />
            </Link>
            <Link href="/inbox" aria-label="Inbox">
                <MessageCircle size={23} />
            </Link>
        </div>}
    >
        {/* Show the full search bar in the desktop layout. */}
        <HomeSearch desktop />
        <div className="home-intro">
            <div>
                <h1>Good finds, right around campus.</h1>
                <p>Find, share and pass on pre-loved things at UM.</p>
            </div>
            <span className="nearby-pill">{active.length} nearby</span>
        </div>
        {/* Send category links to Explore or community requests. */}
        <div className="chip-row home-tabs">
            <Link href="/explore" className="chip active">For you</Link>
            <Link className="chip" href="/explore?type=sell">Buy</Link>
            <Link className="chip" href="/explore?type=donate">Donate</Link>
            <Link className="chip" href="/wanted">Wanted</Link>
        </div>
        {/* Only render the featured card when an active listing exists. */}
        {featured && <div className="home-feature">
            <Link href={`/item/${featured.id}`} className="home-feature-image">
                <img src={featured.image} alt={featured.title} />
                <span className="image-tag">
                    {featured.condition}
                </span>
                <span className="feature-owner">
                    {featured.seller}
                </span>
            </Link>
            <div className="home-feature-copy">
                <div className="feature-price-row">
                    <b>
                        {money(featured.price)}
                    </b>
                    <span className="recommend-pill">Recommended for you</span>
                </div>
                <h3>
                    {featured.title}
                </h3>
                <small><MapPin size={13} /> {featured.location} · 0.3 km &nbsp; <UserRound size={13} /> Student to student</small>
                <div className="home-feature-actions">
                    <Link href={`/item/${featured.id}`} className="primary-button">View item <ArrowRight size={18} /></Link>
                    <Favorite id={featured.id} />
                </div>
            </div>
        </div>}
        <SectionTitle action="View all" onAction={() => window.location.assign('/explore')}>Discover more</SectionTitle>
        {/* Render the item cards from the filtered list. */}
        <div className="items-grid">
            {active.filter(l => l.id !== featured?.id).slice(0, 4).map(l => <ItemCard item={l} key={l.id} />)}
        </div>
        <div className="community-banner">
            <div>
                <small>COMMUNITY · WANTED</small>
                <h3>Someone’s spare. Someone’s need.</h3>
                <p>Ask for what you need, or help a fellow student.</p>
            </div>
            <Link href="/wanted">Explore requests <ArrowRight size={18} /></Link>
        </div>
    </Shell>
}
