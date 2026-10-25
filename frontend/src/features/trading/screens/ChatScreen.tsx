"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CalendarCheck, MessageCircle, MoreHorizontal, Plus, Send } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money } from "@/lib/data";
import { CheckedBadge, Empty, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Read a conversation and send new messages.
export function ChatScreen({ id }: { id: string }) {
    const { threads, listings, sendMessage, readThread } = useMarket();
    // Use the route ID to find the open conversation.
    const thread = threads.find(t => t.id === id);
    const [draft, setDraft] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    // Mark the conversation read when it opens.
    // Clear the unread count after opening the thread.
    useEffect(() => {
        if (thread?.unread) readThread(id)
    }, [id, thread?.unread]);
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [thread?.messages.length]);
    // Handle links to missing or deleted conversations.
    if (!thread) return <Shell title="Conversation" back="/inbox">
        <Empty
            icon={MessageCircle}
            title="No conversation yet"
            subtitle="Open an item to start a new chat."
            action={<Link href="/explore" className="primary-button">Browse items</Link>}
        />
    </Shell>;
    const listing = listings.find(l => l.id === thread.listingId);
    // Only clear the draft after the message is saved.
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (draft.trim() && await sendMessage(id, draft)) {
            setDraft('')
        }
    };
    // Keep the message input pinned below the conversation.
    return <Shell
        title={`${thread.person} · Verified UM`}
        back="/inbox"
        action={<button className="header-round" title="More options">
            <MoreHorizontal size={21} />
        </button>}
        className="chat-screen"
        fixedAction={<form className="chat-compose" onSubmit={submit}>
            <Plus size={22} />
            <input
                aria-label={`Message ${thread.person}`}
                placeholder={`Message ${thread.person}...`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
            />
            <button type="submit" aria-label="Send message" disabled={!draft.trim()}>
                <ArrowRight size={22} />
            </button>
        </form>}
    >
        <div className="chat-panel">
            {listing && <Link href={`/item/${listing.id}`} className="white-card chat-item">
                <img src={listing.image} alt={listing.title} />
                <div>
                    <b>
                        {listing.title}
                    </b>
                    <strong>
                        {money(listing.price)}
                    </strong>
                    <small>
                        {thread.id.startsWith('offer-') ? 'Your community offer' : listing.owner ? 'A student asked about your listing' : `Your ${listing.type === 'donate' ? 'donation' : 'item'} request`}
                    </small>
                    {thread.accepted && <CheckedBadge>Accepted · Pickup arranged</CheckedBadge>}
                </div>
            </Link>}
            <div className="chat-date">Today</div>
            {/* Render sent and received messages with separate styles. */}
            <div className="messages">
                {thread.messages.map(msg => <div className={`message ${msg.byMe ? 'mine' : 'theirs'}`} key={msg.id}>
                    <p>
                        {msg.text}
                    </p>
                    <small>
                        {msg.time}
                        {msg.byMe ? '✓✓' : ''}
                    </small>
                </div>)}
            </div>
            {thread.accepted && <Link href="/request/pickup-lamp" className="chat-pickup white-card">
                <CalendarCheck size={22} />
                <span>
                    <b>18 Oct · 2:00 PM</b>
                    <small>Campus library · Central Library<br />Public entrance, by the noticeboard</small>
                </span>
                <ArrowRight size={17} />
            </Link>}
            <div ref={scrollRef} />
        </div>
    </Shell>
}
