"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Check, CircleHelp, MapPin, ShieldCheck, UserRound, Plus } from "lucide-react";
import { Field, Header, PrimaryButton } from "@/components/ui/MarketplaceUI";
import { useMarket } from "@/lib/store";

// Collect the public details shown on a student profile.
export function OnboardingScreen() {
    const router = useRouter();
    const { profile, updateProfile, inform } = useMarket();
    const [name, setName] = useState(profile.name);
    const [faculty, setFaculty] = useState(profile.faculty);
    const [year, setYear] = useState(profile.year);
    const [pickup, setPickup] = useState(profile.pickup);
    // Save the profile before opening the home page.
    const onDone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            inform("Enter a display name.");
            return;
        }
        if (!await updateProfile({ name, faculty, year, pickup })) return;
        router.push("/home")
    };
    return <div className="onboarding-page">
        <Header
            title="Make yourself at home"
            back="/verify"
            action={<Link href="/help" className="header-round">
                <CircleHelp size={21} />
            </Link>}
        />
        {/* Keep all public profile fields in one form. */}
        <form className="onboard-content" onSubmit={onDone}>
            <span className="verified-pill"><BadgeCheck size={15} /> UM email verified</span>
            <h1>A familiar face. A trusted loop.</h1>
            <p className="muted">Tell fellow students a little about yourself.</p>
            {/* Show initials until profile photos are supported. */}
            <div className="add-photo">
                <span className="onboard-avatar">
                    {name.trim().split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                    <span className="avatar-plus">
                        <Plus size={18} />
                    </span>
                </span>
                <div>
                    <strong>Add a profile photo</strong>
                    <small>Optional · You can change this later.</small>
                </div>
            </div>
            <Field label="Display name">
                <div className="input-icon">
                    <UserRound size={19} />
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
            </Field>
            <Field label="Faculty">
                <select value={faculty} onChange={e => setFaculty(e.target.value)}>
                    <option>Faculty of Science</option>
                    <option>Faculty of Computer Science and Information Technology</option>
                    <option>Faculty of Engineering</option>
                    <option>Faculty of Arts and Social Sciences</option>
                    <option>Faculty of Medicine</option>
                    <option>Faculty of Business and Economics</option>
                    <option>Faculty of Law</option>
                    <option>Faculty of Education</option>
                </select>
            </Field>
            <Field label="Year of study">
                <select value={year} onChange={e => setYear(e.target.value)}>
                    {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n}>Year {n}</option>)}
                </select>
            </Field>
            <Field label="Pickup preference">
                <div className="input-icon">
                    <MapPin size={18} />
                    <select value={pickup} onChange={e => setPickup(e.target.value)}>
                        <option>Central Library · public entrance</option>
                        <option>Faculty of Science</option>
                        <option>Student Union</option>
                        <option>Campus library</option>
                        <option>Agree in chat</option>
                    </select>
                </div>
            </Field>
            {/* Remind students what details stay public. */}
            <div className="trust-note">
                <ShieldCheck size={22} />
                <span><b>Student verified, privacy respected</b><br />Your UM verification badge is public. Your email and exact location are not.</span>
            </div>
            <PrimaryButton type="submit" className="onboard-submit">Complete profile <Check size={19} /></PrimaryButton>
        </form>
    </div>
}
