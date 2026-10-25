"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Circle, Clock3, HeartHandshake, MessageCircle, MoreHorizontal } from "lucide-react";
import { useMarket } from "@/lib/store";
import { money, type Listing } from "@/lib/data";
import { CheckedBadge, Empty, PrimaryButton, SecondaryButton, Shell } from "@/components/ui/MarketplaceUI";
import { TimelineItem } from "../shared";

// Display a request based on its latest status.
export function RequestTrackingScreen({ id }: { id: string }) {
    const router = useRouter();
    const { requests, listings, threads, completeRequest, inform, ensureThread } = useMarket();
    // Find this request before showing its progress.
    const request = requests.find(r => r.id === id);
    // Send the student back to activity if the request is missing.
    if (!request) return <Shell title="Your request" back="/activity">
        <Empty
            icon={CalendarCheck}
            title="Request not found"
            subtitle="View your requests from My activity."
            action={<Link href="/activity" className="primary-button">My activity</Link>}
        />
    </Shell>;
    const item = listings.find(l => l.id === request.listingId);
    if (!item) return <Shell title="Your request" back="/activity"><p>Listing not found.</p></Shell>;
    // The request status controls the next action and timeline.
    const active = request.request_status === 'Accepted', done = request.request_status === 'Completed';
    const closed = request.request_status === 'Rejected' || request.request_status === 'Cancelled';
    // Link the request to any existing conversation about the item.
    const chat = threads.find(t => t.listingId === item.id);
    return <Shell
        title="Your request"
        back="/activity"
        action={<button className="header-round" aria-label="More options">
            <MoreHorizontal size={20} />
        </button>}
        fixedAction={<PrimaryButton onClick={() => active ? completeRequest(request.id) : done || closed ? router.push('/activity') : router.push(chat?.id ? `/chat/${chat.id}` : (ensureThread(item.id) ? `/chat/${ensureThread(item.id)}` : '/inbox'))}>
            {done || closed ? 'Back to my activity' : active ? 'Confirm handover' : 'Open chat'}
            <HeartHandshake size={19} />
        </PrimaryButton>}
    >
        {/* The heading and status badge follow the request state. */}
        <div className="request-tracking">
            <CheckedBadge>
                {done ? 'Handover completed' : active ? 'Accepted · Pickup arranged' : closed ? request.request_status : 'Request sent'}
            </CheckedBadge>
            <h1>
                {done ? 'Another good loop completed.' : active ? 'Your pickup is arranged.' : closed ? `Request ${request.request_status.toLowerCase()}.` : 'Request sent. Fingers crossed!'}
            </h1>
            <p>
                {done ? 'Thanks for giving this item a new home.' : active ? `${item.seller} has saved the item for you. Your next step is to meet on campus.` : closed ? 'This request is no longer active.' : `Your message was sent to ${item.seller}. You can chat while you wait for a reply.`}
            </p>
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
            {/* Keep the agreed pickup details and chat action together. */}
            <div className="white-card pickup-card">
                <div className="pickup-card-date">
                    <CalendarCheck size={23} />
                    <span>
                        <b>
                            {request.date}
                        </b>
                        <small>Campus library · Central Library</small>
                        <small>Public entrance, by the noticeboard</small>
                    </span>
                </div>
                <SecondaryButton onClick={() => router.push(chat?.id ? `/chat/${chat.id}` : (ensureThread(item.id) ? `/chat/${ensureThread(item.id)}` : '/inbox'))}>Chat with {item.seller} <MessageCircle size={18} /></SecondaryButton>
            </div>
            <h3>Your request journey</h3>
            {/* Mark each step using the saved request status. */}
            <div className="timeline">
                <TimelineItem done icon={Check} title="Request sent" detail="Request submitted" />
                <TimelineItem
                    done={active || done}
                    icon={Check}
                    title={`Accepted by ${item.seller}`}
                    detail={active || done ? 'Pickup agreed' : 'Waiting for a reply'}
                />
                <TimelineItem
                    done={done}
                    active={active}
                    icon={Clock3}
                    title="Pickup arranged"
                    detail={`${request.date} · Campus library`}
                />
                <TimelineItem
                    done={done}
                    icon={Circle}
                    title={done ? 'Handover confirmed' : 'Handover not yet confirmed'}
                    detail={done ? 'Item received' : 'Confirm only after you receive the item.'}
                />
            </div>
        </div>
    </Shell>
}
