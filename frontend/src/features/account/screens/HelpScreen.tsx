"use client";
import { useApi } from "@/lib/api/http";
import { PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Explain how the marketplace works in each data mode.
export function HelpScreen() {
    return <Shell title="Help & information" back="/">
        <PageIntro title="Welcome to UMLoop." subtitle="A student-to-student marketplace for the Universiti Malaya community." />
        {/* Show the correct privacy and sign-in notes for the active data mode. */}
        <div className="white-card help-card">
            <h3>How it works</h3>
            <p>Browse listings, save useful finds, ask questions, and arrange a public campus pickup. Students can also donate items or post a community request.</p>
            <h3>Account verification</h3>
            <p>{useApi ? "Email codes are checked by the UM student account service." : "In local sample mode, email checks use a sample code. Live verification needs the backend."}</p>
            <h3>Safe meetups</h3>
            <p>Meet at public campus spots, confirm the item before paying, and never share passwords or codes.</p>
            <h3>Privacy</h3>
            <p>{useApi ? "Account and listing data is sent to the configured backend service." : "Local sample changes stay in this browser. No data is sent to a server."}</p>
        </div>
    </Shell>
}
