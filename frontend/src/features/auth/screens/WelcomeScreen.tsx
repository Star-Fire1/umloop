"use client";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui/MarketplaceUI";
import { AuthFrame } from "../shared";

// Entry screen with sign-in and guest browsing links.
export function WelcomeScreen() {
    return <AuthFrame>
        <div className="auth-brand-row">
            <div className="brand-card">
                <Brand />
            </div>
            <span className="campus-badge"><MapPin size={14} /> Universiti Malaya</span>
        </div>
        {/* Offer sign-in or guest browsing without changing login state. */}
        <section className="auth-card welcome-card">
            <h1>Welcome to UMLoop</h1>
            <p className="lead">Buy. Sell. Donate. Repeat.</p>
            <div className="auth-email-notice">
                <Mail size={22} />
                <span>Your UM email address<small>@siswa.um.edu.my verified students only</small></span>
                <ShieldCheck size={20} />
            </div>
            <Link className="primary-button" href="/login">LOG IN / SIGN UP WITH UM EMAIL</Link>
            <Link className="secondary-button" href="/home">Browse as Guest <ArrowRight size={18} /></Link>
        </section>
        {/* Keep community and help links available before sign-in. */}
        <div className="auth-foot">Looking for UMLoop at your campus?<div>
            <Link href="/wanted">Join Community</Link>
            <span> | </span>
            <Link href="/help">Terms &amp; Privacy</Link>
        </div></div>
    </AuthFrame>
}
