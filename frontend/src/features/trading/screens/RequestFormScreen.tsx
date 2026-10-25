"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Gift, MapPin, Send, ShieldCheck, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money, type PickupRequest } from "@/lib/data";
import { pickupOptions } from "@/lib/format";
import { Chip, Field, PageIntro, PrimaryButton, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Prepare an item request and suggested pickup details.
export function RequestFormScreen({ id, donation }: {
    id: string;
    donation: boolean
}) {
    const router = useRouter();
    const { listings, profile, addRequest, ensureThread, inform } = useMarket();
    // Find the item before preparing the message and pickup details.
    const item = listings.find(l => l.id === id);
    const [message, setMessage] = useState(donation ? `Hi ${item?.seller || 'there'}! I’m ${profile.name}, a ${profile.year} ${profile.faculty.replace('Faculty of ', '')} student. I’d love this item for my study desk. Could I collect it at the campus library tomorrow? Thank you!` : `Hi ${item?.seller || 'there'}! I'm interested in your ${item?.title.toLowerCase() || 'listing'}. Is it still available? Could we arrange a pickup at Central Library?`);
    const [pickup, setPickup] = useState("Campus library");
    // Generate campus pickup dates in Malaysia time.
    const dates = useMemo(() => pickupOptions(), []);
    const [date, setDate] = useState(dates[0].label);
    // Refresh the suggested message when a new item opens.
    useEffect(() => {
        if (!item) return;
        setMessage(donation
            ? `Hi ${item.seller}! I’m ${profile.name}, a ${profile.year} ${profile.faculty.replace('Faculty of ', '')} student. I’d love this item for my study desk. Could I collect it at the campus library tomorrow? Thank you!`
            : `Hi ${item.seller}! I'm interested in your ${item.title.toLowerCase()}. Is it still available? Could we arrange a pickup at Central Library?`);
    }, [item?.id]);
    const [discuss, setDiscuss] = useState(false);
    // Prevent a second submission while the first is being saved.
    const [submitting, setSubmitting] = useState(false);
    if (!item) return <Shell title="Request item" back="/explore">
        <p>Item not found.</p>
    </Shell>;
    // The store checks eligibility and saves the request before navigation.
    const send = async () => {
        if (submitting) return;
        if (!message.trim()) {
            inform("Enter a message for the student.");
            return;
        }
        const requestId = `req-${Date.now()}`;
        const r: PickupRequest = {
            id: requestId,
            listingId: id,
            person: item.seller,
            message,
            date: discuss ? 'To be arranged' : date,
            pickup_at: discuss ? null : dates.find(option => option.label === date)?.at,
            location: pickup,
            request_status: 'Pending',
            requester_email: profile.email,
            is_test: true
        };
        setSubmitting(true);
        const created = await addRequest(r);
        setSubmitting(false);
        if (!created) return;
        ensureThread(id, message);
        sessionStorage.setItem('umloop-last-request', created.id);
        router.push(`/request/${created.id}`)
    };
    return <Shell
        title={donation ? "Request donation" : "Request item"}
        back={`/item/${id}`}
        action={<button className="header-round" onClick={() => router.push(`/item/${id}`)} aria-label="Close">
            <X size={20} />
        </button>}
        fixedAction={<PrimaryButton onClick={send} disabled={submitting}>Send request to {item.seller} <Send size={19} /></PrimaryButton>}
    >
        <PageIntro title={donation ? "A good find. A friendly hello." : "A good find. Your next hello."} subtitle={`Let ${item.seller} know why you’d ${donation ? 'love to give this item a new home' : 'like to collect this item'}.`} />
        {/* Show the exact listing being requested. */}
        <div className="white-card request-summary">
            <img src={item.image} alt={item.title} />
            <div>
                <b>
                    {item.title}
                </b>
                <strong>
                    {money(item.price)}
                </strong>
                <small>{item.seller} · {item.location}</small>
            </div>
        </div>
        <Field label={`Your message to ${item.seller}`}>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} />
        </Field>
        <h3 className="request-subheading">Suggest a safe pickup</h3>
        {/* Allow a suggested date or an open pickup discussion. */}
        <div className="chip-row">
            <Chip active={!discuss} onClick={() => setDiscuss(false)}><MapPin size={15} /> Campus library</Chip>
            <Chip active={discuss} onClick={() => setDiscuss(true)}>Discuss in chat</Chip>
        </div>
        {!discuss && <Field>
            <div className="input-icon">
                <CalendarDays size={20} />
                <select value={date} onChange={e => setDate(e.target.value)}>
                    {dates.map(option => <option key={option.at} value={option.label}>{option.label}</option>)}
                </select>
            </div>
        </Field>}
        <small className="helper">Central Library public entrance. {item.seller} can suggest another time before accepting.</small>
        {/* Explain payment and handover expectations. */}
        <div className="request-assurance">
            <Gift size={21} />
            <span><b>
                {donation ? 'No payment. No obligation.' : `RM ${item.price} · Pay on collection.`}
            </b><br />{donation ? 'This is a free donation request, not a purchase.' : 'This is only a request. No payment is taken in this frontend.'} Pickup is only confirmed once you both agree.</span>
        </div>
        <p className="verified-line"><ShieldCheck size={20} /> {item.seller} sees {profile.name} · Verified UM student</p>
    </Shell>
}
