"use client";
import Link from "next/link";
import { Bell, Heart, Layers3, Leaf, LockKeyhole, MapPin, Megaphone, Settings, Sun } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Avatar, LinkRow, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Show the student's account details and links.
export function ProfileScreen() {
    const { profile, settings, requests, listings } = useMarket();
    // Count the items posted by this student.
    const mine = listings.filter(l => l.owner);
    return <Shell
        title="Your profile"
        current="/profile"
        kind="brand"
        action={<Link href="/profile/settings" className="header-round" aria-label="Settings">
            <Settings size={20} />
        </Link>}
    >
        {/* Show the student's public profile details. */}
        <div className="profile-card white-card">
            <div className="profile-person">
                <Avatar name={profile.name} large />
                <span>
                    <strong>
                        {profile.name}
                    </strong>
                    <Verified />
                    <small>{profile.faculty} · {profile.year}</small>
                </span>
                <Link href="/profile/edit" aria-label="Edit profile">
                    <span className="edit-icon">✎</span>
                </Link>
            </div>
            <div className="profile-location"><MapPin size={18} /> Universiti Malaya · {profile.pickup.replace(' · public entrance', '')} pickup</div>
        </div>
        {/* Group the account and marketplace links. */}
        <div className="profile-menu">
            <h3>Appearance</h3>
            <LinkRow
                href="/profile/appearance"
                icon={Sun}
                title="Appearance"
                subtitle="Light / Dark / System"
            />
            <h3>Sustainability impact</h3>
            <LinkRow
                href="/profile/impact"
                icon={Leaf}
                title="My sustainability impact"
                subtitle="See loops, pickups and waste avoided"
            />
            <h3>Your campus loop</h3>
            <LinkRow
                href="/activity"
                icon={Layers3}
                title="My activity & listings"
                subtitle={`${mine.length} active listing · ${requests.filter(r => r.request_status !== 'Completed').length} pickup arranged`}
            />
            <LinkRow href="/wishlist" icon={Heart} title="Wishlist" subtitle="Your saved campus finds" />
            <LinkRow
                href="/wanted"
                icon={Megaphone}
                title="Community requests"
                subtitle="Ask for something. Offer a little help."
            />
            <h3>Make it yours</h3>
            <LinkRow
                href="/profile/notifications"
                icon={Bell}
                title="Notification preferences"
                subtitle="Messages, requests and pickup reminders"
            />
            <LinkRow
                href="/profile/privacy"
                icon={LockKeyhole}
                title="Privacy & account"
                subtitle="Control your information"
            />
        </div>
    </Shell>
}
