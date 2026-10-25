"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    Bell,
    Check,
    ChevronRight,
    Compass,
    Heart,
    Home,
    Inbox,
    MapPin,
    Plus,
    Search,
    Settings,
    ShieldCheck,
    UserRound,
    type LucideIcon
} from "lucide-react";
import { useMarket } from "@/lib/store";
import { money, shortName, type Listing } from "@/lib/data";
import { type ReactNode } from "react";

// Shared wordmark for headers and sign-in screens.
export function Brand({ compact = false }: { compact?: boolean }) {
    return <span className={compact ? "brand compact" : "brand"}>
        <span>LOOP</span>
        <strong>UM</strong>
    </span>
}
// Use the student's initials when no profile image is stored.
export function Avatar({ name, large = false }: {
    name: string;
    large?: boolean
}) {
    return <span className={large ? "avatar large" : "avatar"}>
        {shortName(name)}
    </span>
}
// Display the student verification badge.
export function Verified({ short = false }: { short?: boolean }) {
    return <span className="verified">
        <ShieldCheck size={14} strokeWidth={2.4} />
        {short ? "Verified UM" : "Verified UM student"}
    </span>
}
// Shared filter and selection button.
export function Chip({ children, active = false, onClick, className = "" }: {
    children: ReactNode;
    active?: boolean;
    onClick?: () => void;
    className?: string
}) {
    return <button type="button" className={`chip ${active ? "active" : ""} ${className}`} onClick={onClick}>
        {children}
    </button>
}
// Primary call-to-action used across the forms.
export function PrimaryButton({ children, onClick, disabled = false, className = "", type = "button" }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit"
}) {
    return <button
        type={type}
        className={`primary-button ${className}`}
        onClick={onClick}
        disabled={disabled}
    >
        {children}
    </button>
}
// Secondary action with the same styling across pages.
export function SecondaryButton({ children, onClick, className = "" }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string
}) {
    return <button type="button" className={`secondary-button ${className}`} onClick={onClick}>
        {children}
    </button>
}
// Wrap an input with its label and optional hint.
export function Field({ label, children, hint }: {
    label?: string;
    children: ReactNode;
    hint?: string
}) {
    return <label className="field">
        {label && <span className="field-label">
            {label}
        </span>}
        {children}
        {hint && <span className="field-hint">
            {hint}
        </span>}
    </label>
}
// Section heading with an optional action.
export function SectionTitle({ children, action, onAction }: {
    children: ReactNode;
    action?: string;
    onAction?: () => void
}) {
    return <div className="section-title">
        <h3>
            {children}
        </h3>
        {action && <button onClick={onAction} className="text-link">
            {action}
        </button>}
    </div>
}
// Shared heading and short page description.
export function PageIntro({ title, subtitle, children }: {
    title: string;
    subtitle?: string;
    children?: ReactNode
}) {
    return <div className="page-intro">
        <h1>
            {title}
        </h1>
        {subtitle && <p>
            {subtitle}
        </p>}
        {children}
    </div>
}

// The same links are used in the mobile tabs and desktop sidebar.
const nav: {
    label: string;
    href: string;
    Icon: LucideIcon
}[] = [
        { label: "Home", href: "/home", Icon: Home },
        { label: "Explore", href: "/explore", Icon: Compass },
        { label: "Sell", href: "/sell", Icon: Plus },
        { label: "Inbox", href: "/inbox", Icon: Inbox },
        { label: "Profile", href: "/profile", Icon: UserRound }
    ];
// Mobile navigation uses the active route to style the current tab.
export function BottomNav({ current }: { current: string }) {
    return <nav className="bottom-nav" aria-label="Main navigation">
        {nav.map(({ label, href, Icon }) => <Link
            className={`bottom-link ${current === href ? "selected" : ""} ${label === "Sell" ? "sell-link" : ""}`}
            href={href}
            key={href}
        >
            <span className="nav-icon">
                <Icon size={label === "Sell" ? 25 : 23} strokeWidth={label === "Sell" ? 2 : 1.9} />
            </span>
            <small>
                {label}
            </small>
        </Link>)}
    </nav>
}
// Show the same core routes in the desktop sidebar.
export function DesktopSidebar({ current }: { current: string }) {
    return <aside className="desktop-sidebar">
        <Link href="/home" className="sidebar-brand">
            <Brand />
            <span>A little good goes around.</span>
        </Link>
        <div className="sidebar-label">CAMPUS MARKETPLACE</div>
        <nav aria-label="Main navigation">
            {nav.map(({ label, href, Icon }) => <Link key={href} href={href} className={`sidebar-link ${current === href ? "selected" : ""}`}>
                <Icon size={21} />
                {label}
                {label === "Sell" && <Plus className="sidebar-plus" size={18} />}
            </Link>)}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">YOUR CAMPUS LOOP</div>
        <Link className="sidebar-link" href="/wishlist"><Heart size={20} />Wishlist</Link>
        <Link className="sidebar-link" href="/wanted"><Bell size={20} />Community requests</Link>
        <Link className="sidebar-link" href="/activity"><Settings size={20} />My activity</Link>
        {/* Keep the campus safety note at the foot of the sidebar. */}
        <div className="sidebar-bottom">
            <div className="sidebar-bottom-inner"><ShieldCheck size={21} />For the UM community<p>Find what you need. Pass on what you don’t.</p></div>
            <span>UMLoop · UM campus</span>
        </div>
    </aside>
}

// Use an explicit back link when provided; otherwise use browser history.
export function Header({ title, back, kind = "back", onSearch, action }: {
    title: string;
    back?: string;
    kind?: "back" | "brand";
    onSearch?: () => void;
    action?: ReactNode
}) {

    const router = useRouter();
    return <header className="top-header">
        <div className="header-left">
            {kind === "brand" ? <Brand compact /> : <button
                type="button"
                aria-label="Go back"
                className="header-round"
                onClick={() => back ? router.push(back) : router.back()}
            >
                <ArrowLeft size={21} />
            </button>}
            <span className="header-title">
                {title}
            </span>
        </div>
        <div className="header-action">
            {action || <button
                aria-label="Search"
                className="header-round"
                onClick={onSearch || (() => router.push('/explore'))}
            >
                <Search size={21} />
            </button>}
        </div>
    </header>
}
// Common page frame for navigation, sticky actions and alerts.
export function Shell({ title, current, back, kind, action, children, fixedAction, className = "", onSearch }: {
    title: string;
    current?: string;
    back?: string;
    kind?: "back" | "brand";
    action?: ReactNode;
    children: ReactNode;
    fixedAction?: ReactNode;
    className?: string;
    onSearch?: () => void
}) {

    const { toast, clearToast } = useMarket();
    return <div className="app-layout">
        <DesktopSidebar current={current || ""} />
        <div className={`app-content ${className}`}>
            <div className="mobile-header">
                <Header title={title} back={back} kind={kind} action={action} onSearch={onSearch} />
            </div>
            <div className="desktop-topbar">
                <h2>
                    {title}
                </h2>
                <div className="desktop-top-actions">
                    <span><MapPin size={15} /> Universiti Malaya</span>
                    <Link href="/wishlist" aria-label="Wishlist">
                        <Heart size={21} />
                    </Link>
                    <Link href="/inbox" aria-label="Messages">
                        <Bell size={21} />
                    </Link>
                    <Link className="desktop-user" href="/profile">
                        <UserRound size={19} />
                    </Link>
                </div>
            </div>
            {/* Leave space for the sticky action when a page has one. */}
            <main className={`page-body ${fixedAction ? "with-fixed-action" : ""}`}>
                {children}
            </main>
            {fixedAction && <div className="fixed-action">
                {fixedAction}
            </div>}
            {current && <BottomNav current={current} />}
            {/* Show store messages at the app level. */}
            {toast && <div className="toast" role="status" onClick={clearToast}>
                {toast}
                <button aria-label="Dismiss">×</button>
            </div>}
        </div>
    </div>
}
// Saving a listing should not trigger its parent link.
export function Favorite({ id, className = "" }: {
    id: string;
    className?: string
}) {
    const { saved, toggleSaved } = useMarket();
    const active = saved.includes(id);
    return <button
        type="button"
        title={active ? "Remove from wishlist" : "Save to wishlist"}
        aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={active}
        className={`favorite ${className} ${active ? "is-saved" : ""}`}
        onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            toggleSaved(id)
        }}
    >
        <Heart size={21} fill={active ? "currentColor" : "none"} />
    </button>
}
// Card used for browsing a listing.
export function ItemCard({ item }: { item: Listing }) {
    return <article className="item-card">
        <Link href={`/item/${item.id}`} className="item-image-link">
            <img src={item.image} alt={item.title} />
            <span className="image-tag">
                {item.condition}
                {item.type === "donate" ? " · Donation" : ""}
            </span>
        </Link>
        <Favorite id={item.id} />
        <Link href={`/item/${item.id}`} className="item-content">
            <strong className="item-price">
                {money(item.price)}
            </strong>
            <h3>
                {item.title}
            </h3>
            <p>{item.location} · {item.seller}</p>
        </Link>
    </article>
}
// Compact listing row for wishlists and activity.
export function ItemRow({ item, href, showRemove = false }: {
    item: Listing;
    href?: string;
    showRemove?: boolean
}) {
    return <div className="item-row">
        <Link href={href || `/item/${item.id}`} className="item-row-image">
            <img src={item.image} alt={item.title} />
        </Link>
        <Link href={href || `/item/${item.id}`} className="item-row-info">
            <strong>
                {item.title}
            </strong>
            <b>
                {money(item.price)}
            </b>
            <small>{item.seller} · {item.location}</small>
            <span className="available">{item.status}</span>
        </Link>
        {showRemove && <div className="item-row-favorite">
            <Favorite id={item.id} />
            <small>Remove</small>
        </div>}
    </div>
}
// Small shared arrow icon.
export function GoArrow() {
    return <ArrowRight size={18} />
}
// Status badge with a check icon.
export function CheckedBadge({ children }: { children: ReactNode }) {
    return <span className="checked-badge">
        <Check size={15} />
        {children}
    </span>
}
// Settings and profile links share one row style.
export function LinkRow({ href, icon: Icon, title, subtitle }: {
    href: string;
    icon: LucideIcon;
    title: string;
    subtitle?: string
}) {
    return <Link href={href} className="profile-menu-row">
        <Icon size={20} />
        <span>
            <strong>
                {title}
            </strong>
            {subtitle && <small>
                {subtitle}
            </small>}
        </span>
        <ChevronRight size={19} />
    </Link>
}
// Fallback message for empty lists and missing records.
export function Empty({ icon: Icon, title, subtitle, action }: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    action?: ReactNode
}) {
    return <div className="empty">
        <Icon size={35} />
        <h3>
            {title}
        </h3>
        <p>
            {subtitle}
        </p>
        {action}
    </div>
}
