"use client";
import { Leaf } from "lucide-react";
import { useMarket } from "@/lib/store";
import { completedReuseCounts } from "@/lib/domain/marketplace";
import { PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Show the student's reuse and sharing activity.
export function ImpactScreen() {
    const { requests, listings } = useMarket();
    // Test listings do not contribute to completed handovers.
    const totals = completedReuseCounts(listings);
    const completed = Object.values(totals).reduce((total, count) => total + count, 0);
    // Count the student's donation listings separately.
    const donated = listings.filter(l => l.owner && l.type === 'donate').length;
    return <Shell title="My sustainability impact" back="/profile">
        <PageIntro title="Every little loop counts." subtitle="Keep things useful. Keep them in the community." />
        <div className="impact-hero">
            <Leaf size={32} />
            <h2>Good things go around.</h2>
            <p>Buying pre-loved and sharing items can help reduce waste on campus.</p>
        </div>
        {/* Show totals without treating test records as completed reuse. */}
        <div className="impact-stats">
            <div className="white-card">
                <strong>
                    {completed}
                </strong>
                <span>Handovers completed</span>
            </div>
            <div className="white-card">
                <strong>
                    {donated}
                </strong>
                <span>Items offered for donation</span>
            </div>
            <div className="white-card">
                <strong>
                    {listings.filter(l => l.owner).length}
                </strong>
                <span>Listings shared</span>
            </div>
        </div>
        <p className="helper">Completed handovers exclude test records. Waste saved is not estimated without verified data.</p>
    </Shell>
}
