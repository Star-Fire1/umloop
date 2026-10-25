"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Check, ShieldCheck } from "lucide-react";
import { Brand, PrimaryButton } from "@/components/ui/MarketplaceUI";
import { useMarket } from "@/lib/store";
import { useApi } from "@/lib/api/http";
import { AuthFrame } from "../shared";

// Submit the one-time email code to finish verification.
export function VerifyScreen() {
    const router = useRouter();
    const { profile, verifyEmail, inform } = useMarket();
    // The fixed code is for the local demo, not API mode.
    const [code, setCode] = useState(useApi ? "" : "248610");
    // Only move to onboarding after the code is accepted.
    const verify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!await verifyEmail(code)) return;
        router.push("/onboarding")
    };
    return <AuthFrame title="Email verification">
        <div className="verify-brand">
            <div className="brand-card">
                <Brand />
            </div>
            <div>EMAIL <ArrowRight size={16} /> PROFILE</div>
        </div>
        <form className="auth-card verify-card" onSubmit={verify}>
            <h1>Check your UM inbox</h1>
            <p>Enter the six-digit code for</p>
            <strong>
                {profile.email}
            </strong>
            {/* Display each entered digit while the real input stays accessible. */}
            <div className="digit-boxes" onClick={() => document.getElementById('code-input')?.focus()}>
                {Array.from({ length: 6 }, (_, i) => <span key={i}>
                    {code[i] || ""}
                </span>)}
            </div>
            <input
                id="code-input"
                className="sr-input"
                aria-label="Six-digit code"
                value={code}
                maxLength={6}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="one-time-code"
            />
            {!useApi && <small>Demo code: 248610. No verification email was sent.</small>}
            <PrimaryButton type="submit">Verify email <ShieldCheck size={18} /></PrimaryButton>
            <Link className="auth-text-link" href="/login">Use a different email</Link>
        </form>
        <div className="auth-benefit">
            <BadgeCheck size={21} />
            <span><b>{useApi ? "Email verification" : "Example verification state"}</b><br />{useApi ? "Use the one-time code sent to your UM student email." : "This is a sample email and code for the design. No verification email has been sent."}</span>
        </div>
        <small className="auth-legal">Your email is used to verify your campus, not shown on your public profile.</small>
    </AuthFrame>
}
