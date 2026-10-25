"use client";
import { Check, type LucideIcon } from "lucide-react";

// Shared UI used in the request flow.
export function TimelineItem({ done, active = false, icon: Icon, title, detail }: {
    done: boolean;
    active?: boolean;
    icon: LucideIcon;
    title: string;
    detail: string
}) {
    return <div className={`timeline-item ${done ? 'done' : ''} ${active ? 'current' : ''}`}>
        <span className="timeline-dot">
            {done ? <Check size={14} /> : <Icon size={17} />}
        </span>
        <div>
            <b>
                {title}
            </b>
            <small>
                {detail}
            </small>
        </div>
    </div>
}
