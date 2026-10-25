"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, Plus, Send } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Avatar, Field, PageIntro, PrimaryButton, Shell } from "@/components/ui/MarketplaceUI";

// Send an offer against an existing community request.
export function OfferScreen({ id }: { id: string }) {
    const router = useRouter();
    const { wanted, listings, ensureWantedThread, inform } = useMarket();
    const w = wanted.find(x => x.id === id);
    // Only show the current student's listings in the offer selector.
    const owned = listings.filter(l => l.owner);
    const [item, setItem] = useState(owned[0]?.id || "");
    const [message, setMessage] = useState("Hi! I saw your community request. I might have something that could help. Is it still needed?");
    // Handle links to requests that no longer exist.
    if (!w) return <Shell title="Offer an item" back="/wanted">
        <p>Request not found.</p>
    </Shell>;
    // An offer starts a chat linked to an existing listing.
    const send = async () => {
        if (!item) {
            inform("Post an item first so you can offer it.");
            return;
        }
        const threadId = await ensureWantedThread(w.id, item, `Regarding “${w.title}”: ${message}`);
        if (!threadId) return;
        inform("Your offer is ready in your messages.");
        router.push(`/chat/${threadId}`)
    };
    return <Shell
        title="Offer an item"
        back="/wanted"
        fixedAction={<PrimaryButton onClick={send}>Send offer <Send size={18} /></PrimaryButton>}
    >
        <PageIntro title="A little help goes a long way." subtitle={`Offer something to ${w.requester}. Keep collection on campus.`} />
        <div className="white-card request-summary">
            <Avatar name={w.requester} />
            <div>
                <strong>
                    {w.title}
                </strong>
                <small>
                    {w.description}
                </small>
            </div>
        </div>
        {/* An offer must point to an existing listing. */}
        <Field label="Choose one of your listings">
            <select value={item} onChange={e => setItem(e.target.value)}>
                <option value="">Select an item</option>
                {owned.map(l => <option key={l.id} value={l.id}>
                    {l.title}
                </option>)}
            </select>
        </Field>
        <Link href="/sell" className="text-link offer-new">Or post a new item <Plus size={16} /></Link>
        {/* Keep the offer message editable before sending. */}
        <Field label="Your message">
            <textarea value={message} rows={5} onChange={e => setMessage(e.target.value)} />
        </Field>
        <p className="safety-inline"><ShieldCheck size={19} /> Agree on a safe public pickup spot in your chat.</p>
    </Shell>
}
