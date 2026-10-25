"use client";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Header } from "@/components/ui/MarketplaceUI";

// Shared layout for the sign-in and verification screens.
export function AuthFrame({ children, title }: {
    children: React.ReactNode;
    title?: string
}) {
    return <div className="auth-screen">
        <div className="auth-background" />
        <div className="auth-gradient" />
        <div className="auth-inner">
            {title && <div className="auth-header">
                <Header
                    title={title}
                    back="/"
                    action={<Link href="/help" className="header-round" aria-label="Help">
                        <CircleHelp size={20} />
                    </Link>}
                />
            </div>}
            {children}
        </div>
    </div>
}
