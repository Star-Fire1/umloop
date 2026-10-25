"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mail, MapPin, ShieldCheck } from "lucide-react";
import { Brand, Field, PrimaryButton } from "@/components/ui/MarketplaceUI";
import { useMarket } from "@/lib/store";
import { AuthFrame } from "../shared";

// Collect the UM address used to start sign-in.
export function LoginScreen() {
    const router = useRouter();
    const { profile, beginVerification, inform } = useMarket();
    // Keep the email input separate from the saved profile.
    const [email, setEmail] = useState(profile.email);
    // Request a one-time code only for UM student addresses.
    const go = async (e: React.FormEvent) => {
        e.preventDefault();
        const formatted = email.trim().toLowerCase();
        if (!/^[^\s@]+@siswa\.um\.edu\.my$/.test(formatted)) {
            inform("Please use your @siswa.um.edu.my student email.");
            return;
        }
        if (!await beginVerification(formatted)) return;
        router.push("/verify")
    };
    return <AuthFrame title="Your campus connection">
        <div className="auth-campus-row">
            <div className="brand-card">
                <Brand />
            </div>
            <span><MapPin size={15} /> Universiti Malaya</span>
        </div>
        {/* Validate the email when the form is submitted. */}
        <form className="auth-card login-card" onSubmit={go}>
            <strong className="eyebrow">YOUR STUDENT LOOP STARTS HERE</strong>
            <h1>One email.<br />A whole campus.</h1>
            <p>Sign in or create your UMLoop account with your UM student email.</p>
            <Field label="UM email address">
                <div className="input-icon">
                    <Mail size={19} />
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="student@siswa.um.edu.my"
                        required
                    />
                </div>
            </Field>
            <small>Only @siswa.um.edu.my student email addresses are eligible.</small>
            <PrimaryButton type="submit">Continue with UM email <ArrowRight size={18} /></PrimaryButton>
            <p className="auth-caption">New here? Email verification creates your account. No password to remember.</p>
        </form>
        {/* Explain the campus account rules below the form. */}
        <div className="auth-benefit">
            <ShieldCheck size={20} />
            <span><b>A little trust goes a long way</b><br />Verify your student email before posting or requesting. Your email stays private.</span>
        </div>
        <small className="auth-legal">By continuing, you agree to <Link href="/help">Terms &amp; Privacy</Link>.</small>
    </AuthFrame>
}
