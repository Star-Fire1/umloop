"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, MapPin, MessageCircle, Search, Share2, ShieldCheck, Gift } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money } from "@/lib/data";
import { Avatar, Empty, Favorite, PrimaryButton, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Show the selected listing and the action available to this user.
export function DetailScreen({ id }: { id: string }) {
    const router = useRouter();
    const { listings, inform } = useMarket();
    // Look up the listing for this route.
    const item = listings.find(l => l.id === id);
    const [selected, setSelected] = useState(0);
    // Use extra local photos for the two sample items.
    const photo = item?.id === 'calculus' ? '/images/books-detail.jpg' : item?.id === 'lamp' ? '/images/lamp-detail.jpg' : item?.image;
    const photos = item?.images?.length ? item.images : [photo, photo, photo];
    // Show a fallback when the listing ID is not found.
    if (!item) return <Shell title="Item not found" back="/explore">
        <Empty
            icon={Search}
            title="This item is not available"
            subtitle="Browse other items from UM students."
            action={<Link className="primary-button" href="/explore">Explore items</Link>}
        />
    </Shell>;

    // Copy the current item URL rather than sharing listing data.
    const share = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            inform("Item link copied to clipboard.");
        } catch {
            inform("Share this page link with a friend.");
        }
    };

    // The sticky button opens editing for owners and requests for other students.
    return <Shell
        title={item.type === 'donate' ? "A little good, passed on" : "Item details"}
        back="/explore"
        action={<button className="header-round" onClick={share} aria-label="Share item">
            <Share2 size={20} />
        </button>}
        fixedAction={<PrimaryButton disabled={!item.owner && (item.status !== "Available" || item.is_paused)} onClick={() => router.push(item.owner ? `/sell/edit/${id}` : item.type === 'donate' ? `/request-donation/${id}` : `/request-item/${id}`)}>
            {item.owner ? "Manage my listing" : item.status !== "Available" || item.is_paused ? "Item unavailable" : item.type === 'donate' ? "Request donation" : `Request item · ${money(item.price)}`}
            <MessageCircle size={19} />
        </PrimaryButton>}
    >
        <div className="details-layout">
            {/* The selected thumbnail sets the main photo. */}
            <div className="details-gallery">
                <div className="detail-photo">
                    <img
                        src={photos[selected] || photo}
                        alt={item.title}
                        style={{ objectPosition: selected === 1 ? '40% center' : selected === 2 ? '65% center' : 'center' }}
                    />
                    <Favorite id={item.id} />
                    <span className="photo-count">{selected + 1} / {photos.length}</span>
                </div>
                <div className="thumbnail-row">
                    {photos.map((src, i) => <button
                        aria-label={`View image ${i + 1}`}
                        className={selected === i ? "selected" : ""}
                        key={i}
                        onClick={() => setSelected(i)}
                    >
                        <img src={src} alt="" />
                    </button>)}
                    <span>
                        {item.category === 'Books' ? "Cover · spines · bundle" : item.category === 'Dorm' ? "Item · detail views" : "Item photos"}
                    </span>
                </div>
            </div>
            {/* Keep price, seller and pickup information next to the gallery. */}
            <div className="details-info">
                <div className="chip-row">
                    <span className="chip active">
                        {item.type === 'donate' ? <Gift size={14} /> : null}
                        {item.type === 'donate' ? 'Donate' : 'Buy'}
                    </span>
                    <span className="chip">
                        {item.condition}
                        {item.type === 'donate' ? ' condition' : ''}
                    </span>
                </div>
                <h1>
                    {item.title}
                </h1>
                <div className="detail-price">
                    {money(item.price)}
                    {item.type === 'donate' && <span>A gift to another UM student</span>}
                </div>
                <h3>
                    {item.tagline}
                </h3>
                <p className="detail-description">
                    {item.description}
                </p>
                <small>{item.category === 'Dorm' ? 'Dorm essentials' : item.category} · {item.status}</small>
                <Link className="seller-panel" href={`/student/${encodeURIComponent(item.seller)}`}>
                    <div className="seller-top">
                        <Avatar name={item.seller} />
                        <span>
                            <b>
                                {item.seller}
                            </b>
                            <Verified />
                        </span>
                        <ChevronRight size={20} />
                    </div>
                    <div className="pickup-location">
                        <MapPin size={19} />
                        <span>
                            <strong>
                                {item.location}
                            </strong>
                            <small>Public entrance · Agree a time in chat</small>
                        </span>
                    </div>
                </Link>
                <div className="detail-safety"><ShieldCheck size={21} /> Choose a public pickup spot on campus. Share no passwords or verification codes.</div>
            </div>
        </div>
    </Shell>
}
