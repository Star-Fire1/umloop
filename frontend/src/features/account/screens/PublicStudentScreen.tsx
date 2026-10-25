"use client";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Avatar, PageIntro, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Show one student's public listings.
export function PublicStudentScreen({ name }: { name: string }) {
    const { listings } = useMarket();
    // Decode the student name from the URL.
    const student = decodeURIComponent(name);
    // Show only listings by this student.
    const items = listings.filter(l => l.seller === student);
    return <Shell title="Student profile" back="/explore">
        <div className="profile-card white-card">
            <div className="profile-person">
                <Avatar name={student} large />
                <span>
                    <strong>
                        {student}
                    </strong>
                    <Verified />
                    <small>Universiti Malaya student</small>
                </span>
            </div>
            <div className="profile-location"><MapPin size={18} /> Campus pickup · Public meetup spots</div>
        </div>
        <PageIntro title="Shared by this student" subtitle={`${items.length} item${items.length === 1 ? '' : 's'} available in the campus loop.`} />
        {/* Link each public listing to its detail page. */}
        <div className="items-grid">
            {items.map(l => <Link key={l.id} href={`/item/${l.id}`} className="white-card student-listing">
                <img src={l.image} alt={l.title} />
                <div>
                    <b>
                        {l.title}
                    </b>
                    <strong>
                        {l.price ? `RM ${l.price}` : 'Free'}
                    </strong>
                </div>
            </Link>)}
        </div>
    </Shell>
}
