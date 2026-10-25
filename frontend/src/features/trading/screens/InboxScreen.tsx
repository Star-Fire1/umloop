"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, MessageCircle, PenLine, Search, ShieldCheck } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money } from "@/lib/data";
import { Chip, Empty, PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Conversation previews come from the current thread list.
// Find and filter the student's conversations.
export function InboxScreen() {
    const { threads, listings } = useMarket();
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('All');
    // Search by student or item and apply the selected inbox tab.
    const shown = threads.filter(t => {
        const l = listings.find(x => x.id === t.listingId);
        return `${t.person} ${l?.title || ''}`.toLowerCase().includes(query.toLowerCase()) && (tab === 'All' || (tab === 'Unread' && t.unread > 0) || (tab === 'Requests' && t.accepted));
    });
    // Count unread messages for the inbox header.
    const unread = threads.reduce((n, t) => n + t.unread, 0);
    return <Shell
        title="Inbox"
        current="/inbox"
        kind="brand"
        action={<Link href="/explore" className="header-round" aria-label="New conversation">
            <PenLine size={20} />
        </Link>}
    >
        <PageIntro title="Good loops start here." subtitle="Your campus conversations, all together." />
        <div className="explore-search">
            <Search size={21} />
            <input
                placeholder="Search people or items"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
        </div>
        {/* Show all threads, unread threads or request threads. */}
        <div className="chip-row inbox-filters">
            {["All", `Unread · ${unread}`, "Requests"].map(x => <Chip key={x} active={tab === x.split(' ')[0]} onClick={() => setTab(x.split(' ')[0])}>
                {x}
            </Chip>)}
        </div>
        {/* Each preview links to its full conversation. */}
        <div className="thread-list">
            {shown.map(t => {
                const l = listings.find(x => x.id === t.listingId);
                return <Link href={`/chat/${t.id}`} className="thread-row" key={t.id}>
                    <img src={l?.image || '/images/books.jpg'} alt="" />
                    <div>
                        <div className="thread-head">
                            <strong>
                                {t.person}
                                <Check size={14} />
                            </strong>
                            <small>
                                {t.messages.at(-1)?.time || 'Today'}
                            </small>
                        </div>
                        <b>{l?.title} · {money(l?.price || 0)}</b>
                        <p>
                            {t.messages.at(-1)?.byMe ? 'You: ' : ''}
                            {t.messages.at(-1)?.text || 'Start a conversation'}
                        </p>
                        {t.accepted && <span>Accepted · Pickup tomorrow</span>}
                    </div>
                    {t.unread > 0 && <span className="unread-dot">
                        {t.unread}
                    </span>}
                </Link>
            })}
            {!shown.length && <Empty
                icon={MessageCircle}
                title="No conversations found"
                subtitle="Try a different name or search term."
            />}
        </div>
        <p className="inbox-safety">
            <ShieldCheck size={21} />
            <span><b>Keep your conversations in the loop</b><br />Agree on public campus pickup spots. Never share passwords or verification codes.</span>
        </p>
    </Shell>
}
