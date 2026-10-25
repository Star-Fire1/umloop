"use client";
import { Bell, LockKeyhole, Settings, Sun, UserRound } from "lucide-react";
import { LinkRow, PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Group the account settings in one menu.
export function SettingsScreen() {
    return <Shell title="Settings" back="/profile">
        <PageIntro title="Your settings." subtitle="Account, display and notification controls." />
        {/* Link to each settings screen. */}
        <div className="profile-menu">
            <LinkRow
                href="/profile/edit"
                icon={UserRound}
                title="Edit profile"
                subtitle="Name, faculty and pickup preference"
            />
            <LinkRow
                href="/profile/appearance"
                icon={Sun}
                title="Appearance"
                subtitle="Light / Dark / System"
            />
            <LinkRow
                href="/profile/notifications"
                icon={Bell}
                title="Notification preferences"
                subtitle="Messages and pickup reminders"
            />
            <LinkRow
                href="/profile/privacy"
                icon={LockKeyhole}
                title="Privacy & account"
                subtitle="Student account details"
            />
        </div>
    </Shell>
}
