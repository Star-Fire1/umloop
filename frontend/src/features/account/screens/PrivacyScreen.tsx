"use client";
import { useRouter } from "next/navigation";
import { LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { useMarket } from "@/lib/store";
import { useApi } from "@/lib/api/http";
import { PageIntro, SecondaryButton, Shell } from "@/components/ui/MarketplaceUI";

// Show account privacy details and sign-out options.
export function PrivacyScreen() {
    const router = useRouter();
    // Use account state for the email and sign-out action.
    const { profile, inform, logout } = useMarket();
    return <Shell title="Privacy & account" back="/profile">
        <PageIntro title="Your loop, your choice." subtitle="Your email stays private from other students." />
        {/* Show which account details are visible to the student. */}
        <div className="settings-card white-card">
            <div className="privacy-item">
                <ShieldCheck size={22} />
                <span>
                    <b>UM student verified</b>
                    <small>Your badge is public. Your email is not.</small>
                </span>
            </div>
            <div className="privacy-item">
                <LockKeyhole size={22} />
                <span>
                    <b>Student email</b>
                    <small>
                        {profile.email}
                    </small>
                </span>
            </div>
            <div className="privacy-item">
                <MapPin size={22} />
                <span>
                    <b>Public pickup only</b>
                    <small>Choose a pickup point on campus. No live location tracking.</small>
                </span>
            </div>
        </div>
        {/* Wait for sign-out before returning to the welcome page. */}
        <SecondaryButton onClick={async () => {
            if (!await logout()) return;
            inform('Signed out.');
            router.push('/');
        }}>Log out</SecondaryButton>
        {/* Only local demo mode offers a browser-data reset. */}
        {!useApi && <button className="text-link reset-demo" onClick={() => {
            if (window.confirm('Reset your local UMLoop demo data?')) {
                localStorage.removeItem('umloop-frontend-mock-v2');
                localStorage.removeItem('umloop-sell-draft');
                window.location.href = '/'
            }
        }}>Reset demo data on this device</button>}
    </Shell>
}
