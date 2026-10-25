"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Layers3, Pause, PenLine, Plus } from "lucide-react";
import { useMarket } from "@/lib/store";
import { CheckedBadge, Empty, ItemRow, PageIntro, SecondaryButton, SectionTitle, Shell } from "@/components/ui/MarketplaceUI";

// Switch between owned listings and submitted requests.
export function ActivityScreen() {
    const router = useRouter();
    const { listings, paused, pauseListing, requests} = useMarket();
    // Keep the selected tab local to this page.
    const [tab, setTab] = useState<"listing" | "requests">('listing');
    // Owner flags and request records are supplied by the store.
    const mine = listings.filter(l => l.owner);
    const next = requests.find(r => r.request_status === 'Pending' || r.request_status === 'Accepted');
    return <Shell
        title="My activity"
        current="/profile"
        back="/profile"
        action={<Link className="header-round" href="/sell" aria-label="New listing">
            <Plus size={22} />
        </Link>}
    >
        <PageIntro title="Your loops, in motion." subtitle="Manage what you’re sharing and collecting." />
        {/* Switch between listings the student owns and requests they made. */}
        <div className="segmented-tabs">
            <button className={tab === 'listing' ? 'active' : ''} onClick={() => setTab('listing')}>My listings · {mine.length}</button>
            <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Requests · {requests.length}</button>
        </div>
        {tab === 'listing' ? <>
            <SectionTitle action="Manage listings" onAction={() => router.push('/activity')}>My active listing{mine.length !== 1 ? 's' : ''}</SectionTitle>
            {/* Give each owned listing edit and pause controls. */}
            {mine.map(item => <div key={item.id} className="activity-card white-card">
                <ItemRow item={item} />
                <div className="status-between">
                    <CheckedBadge>
                        {paused.includes(item.id) || item.is_paused ? 'Paused' : item.status}
                    </CheckedBadge>
                    <small>{item.condition} condition</small>
                </div>
                <div className="activity-buttons">
                    <SecondaryButton onClick={() => router.push(`/sell/edit/${item.id}`)}><PenLine size={17} /> Edit listing</SecondaryButton>
                    <SecondaryButton onClick={() => pauseListing(item.id)}>
                        {paused.includes(item.id) || item.is_paused ? <Check size={17} /> : <Pause size={17} />}
                        {paused.includes(item.id) || item.is_paused ? 'Resume' : 'Pause'}
                    </SecondaryButton>
                </div>
            </div>)}
            {mine.length === 0 && <Empty
                icon={Layers3}
                title="No listings yet"
                subtitle="Start with something you no longer need."
                action={<Link href="/sell" className="primary-button">Post an item</Link>}
            />}
            <SectionTitle action="All requests" onAction={() => setTab('requests')}>Next pickup</SectionTitle>
            {next && <div className="activity-card white-card activity-pickup">
                <ItemRow item={listings.find(l => l.id === next.listingId) || listings[0]} />
                <Link href={`/request/${next.id}`} className="activity-request-link">
                    <CheckedBadge>
                        {next.request_status === 'Accepted' ? 'Accepted · Pickup arranged' : next.request_status === 'Pending' ? 'Request sent' : 'Completed'}
                    </CheckedBadge>
                    <strong>
                        {next.date}
                    </strong>
                    <small>
                        {next.location}
                    </small>
                </Link>
            </div>}
        </> : <>
            <SectionTitle>Your requests</SectionTitle>
            {/* Link each submitted request to its tracking page. */}
            {requests.map(r => {
                const item = listings.find(l => l.id === r.listingId);
                return item ? <div className="activity-card white-card request-activity" key={r.id}>
                    <ItemRow item={item} />
                    <Link href={`/request/${r.id}`} className="activity-request-link">
                        <div className="status-between">
                            <CheckedBadge>
                                {r.request_status === 'Pending' ? 'Request sent' : r.request_status === 'Accepted' ? 'Accepted · Pickup arranged' : 'Handover complete'}
                            </CheckedBadge>
                            <ChevronDown size={18} />
                        </div>
                        <small>{r.date} · {r.location}</small>
                    </Link>
                </div> : null
            })}
        </>}
    </Shell>
}
