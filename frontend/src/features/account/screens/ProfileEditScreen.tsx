"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useMarket } from "@/lib/store";
import { Avatar, Field, PageIntro, PrimaryButton, Shell } from "@/components/ui/MarketplaceUI";

// Edit profile details kept in the marketplace store.
export function ProfileEditScreen() {
    const router = useRouter();
    const { profile, updateProfile, inform } = useMarket();
    // Copy the stored profile into editable form fields.
    const [name, setName] = useState(profile.name);
    const [faculty, setFaculty] = useState(profile.faculty);
    const [year, setYear] = useState(profile.year);
    const [pickup, setPickup] = useState(profile.pickup);
    // Update the form when profile data arrives from the API.
    useEffect(() => {
        setName(profile.name);
        setFaculty(profile.faculty);
        setYear(profile.year);
        setPickup(profile.pickup);
    }, [profile.email, profile.name, profile.faculty, profile.year, profile.pickup]);
    // Validate and save before returning to the profile.
    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            inform('Add a display name.');
            return;
        }
        if (!await updateProfile({ name, faculty, year, pickup })) return;
        inform('Profile updated.');
        router.push('/profile')
    };
    return <Shell
        title="Edit profile"
        back="/profile"
        fixedAction={<PrimaryButton onClick={() => document.getElementById('profile-edit-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))}>Save changes <Check size={19} /></PrimaryButton>}
    >
        {/* The fixed save button submits this form. */}
        <form id="profile-edit-form" onSubmit={save}>
            <PageIntro title="Make it yours." subtitle="Your public student profile helps others recognise you." />
            {/* Show the initials for the name currently being edited. */}
            <div className="edit-avatar">
                <Avatar name={name || 'UM student'} large />
            </div>
            <Field label="Display name">
                <input value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Faculty">
                <select value={faculty} onChange={e => setFaculty(e.target.value)}>
                    {[
                        'Faculty of Science',
                        'Faculty of Computer Science and Information Technology',
                        'Faculty of Arts and Social Sciences',
                        'Faculty of Engineering',
                        'Faculty of Medicine',
                        'Faculty of Business and Economics',
                        'Faculty of Education',
                        'Faculty of Law'
                    ].map(x => <option key={x}>
                        {x}
                    </option>)}
                </select>
            </Field>
            <Field label="Year of study">
                <select value={year} onChange={e => setYear(e.target.value)}>
                    {[1, 2, 3, 4, 5, 6].map(y => <option key={y}>Year {y}</option>)}
                </select>
            </Field>
            <Field label="Preferred campus pickup">
                <select value={pickup} onChange={e => setPickup(e.target.value)}>
                    <option>Central Library · public entrance</option>
                    <option>Faculty of Science</option>
                    <option>Student Union</option>
                    <option>Agree in chat</option>
                </select>
            </Field>
            <p className="safety-inline"><ShieldCheck size={20} /> Your student email stays private.</p>
        </form>
    </Shell>
}
