"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MapPin, Megaphone, ShieldCheck, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { type Category, type Wanted } from "@/lib/data";
import { Avatar, Field, PageIntro, PrimaryButton, Shell, Verified } from "@/components/ui/MarketplaceUI";

// Post a new community request.
export function WantedNewScreen() {
    const router = useRouter();
    const { profile, addWanted, inform } = useMarket();
    // Hold the wanted-post fields until the student submits them.
    const [title, setTitle] = useState("Scientific calculator");
    const [cat, setCat] = useState<Category>('Tech');
    const [description, setDescription] = useState("I need a scientific calculator for my Year 2 classes. A basic working model is perfect. Happy to give a pre-loved one a new home!");
    const [budget, setBudget] = useState('30');
    const [donation, setDonation] = useState(true);
    const [pickup, setPickup] = useState('Central Library · public entrance');
    // Save the wanted post before returning to the list.
    const post = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            inform("Add a title and description.");
            return;
        }
        const w: Wanted = {
            id: `wanted-${Date.now()}`,
            title: title.trim(),
            category: cat,
            requester: profile.name,
            faculty: profile.faculty,
            year: profile.year,
            budget: Number(budget) || 0,
            donation,
            description: description.trim(),
            posted: 'Just now'
        };
        if (!await addWanted(w)) return;
        inform('Your community request is posted.');
        router.push('/wanted')
    };
    return <Shell
        title="Ask your community"
        back="/wanted"
        action={<button className="header-round" onClick={() => router.push('/wanted')} aria-label="Close">
            <X size={20} />
        </button>}
        fixedAction={<PrimaryButton onClick={() => document.getElementById('wanted-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}>Post community request <Megaphone size={19} /></PrimaryButton>}
    >
        {/* Submit all wanted-post fields together. */}
        <form id="wanted-form" onSubmit={post}>
            <span className="checked-badge wanted-label"><Megaphone size={15} /> Wanted · Not a listing</span>
            <PageIntro title="What would help you out?" subtitle="Let students know what you’re looking for. They can offer an item they already have." />
            <Field label="I'm looking for">
                <input
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="What do you need?"
                />
            </Field>
            <Field label="Category">
                <select value={cat} onChange={e => setCat(e.target.value as Category)}>
                    <option value="Tech">Tech · Study essentials</option>
                    <option value="Books">Books</option>
                    <option value="Dorm">Dorm essentials</option>
                    <option value="Fashion">Fashion</option>
                </select>
            </Field>
            <Field label="A little about your request">
                <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)} required />
            </Field>
            {/* Let the student set a budget and allow donations. */}
            <div className="two-fields">
                <Field label="Budget up to (RM)">
                    <input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} />
                </Field>
                <Field label=" ">
                    <label className="checkbox-box"><input type="checkbox" checked={donation} onChange={e => setDonation(e.target.checked)} /> Open to donation</label>
                </Field>
            </div>
            <Field label="Campus pickup">
                <div className="input-icon">
                    <MapPin size={18} />
                    <select value={pickup} onChange={e => setPickup(e.target.value)}>
                        <option>Central Library · public entrance</option>
                        <option>Faculty of Science</option>
                        <option>Student Union</option>
                        <option>Agree in chat</option>
                    </select>
                </div>
            </Field>
            {/* Show the public identity used for this post. */}
            <div className="posting-as">
                <Avatar name={profile.name} />
                <span>
                    <b>Posting as {profile.name}</b>
                    <small>Verified UM student · {profile.faculty}</small>
                </span>
            </div>
            <p className="safety-inline"><ShieldCheck size={20} /> Your email and exact location are not shown.</p>
        </form>
    </Shell>
}
