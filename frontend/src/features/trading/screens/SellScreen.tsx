"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Camera, Gift, MapPin, ShieldCheck, X } from "lucide-react";
import { useMarket } from "@/lib/store";
import { useApi } from "@/lib/api/http";
import { type Category, type Listing } from "@/lib/data";
import { Chip, Field, PrimaryButton, SectionTitle, Shell } from "@/components/ui/MarketplaceUI";

// Create or edit a listing using the same form.
export function SellScreen({ editId }: { editId?: string }) {
    const router = useRouter();
    const { listings, addListing, updateListing, profile, inform } = useMarket();
    // Use the same screen for new listings and edits.
    const existing = editId ? listings.find(l => l.id === editId) : null;

    // Keep selected image previews with the form state.
    const [images, setImages] = useState<string[]>(existing ? (existing.images?.length ? existing.images : [existing.image]) : (useApi ? [] : ["/images/desk.jpg", "/images/desk.jpg"]));

    const [type, setType] = useState<"sell" | "donate">(existing?.type || "sell");
    const [title, setTitle] = useState(existing?.title || (useApi ? "" : "Foldable study table"));
    const [price, setPrice] = useState(String(existing?.price ?? (useApi ? "" : 45)));
    const [condition, setCondition] = useState<"Like new" | "Good">(existing?.condition || "Good");
    const [category, setCategory] = useState<Category>(existing?.category || "Dorm");
    const [description, setDescription] = useState(existing?.description || (useApi ? "" : "Compact foldable table, great for a small room. Sturdy legs and a few light marks on the top. Selling as I’m rearranging my study space."));
    const [pickup, setPickup] = useState(existing?.location || "Central Library");
    const fileInput = useRef<HTMLInputElement>(null);

    // Load saved listing fields when editing an existing item.
    useEffect(() => {
        if (!editId || !existing) return;
        setImages(existing.images?.length ? existing.images : [existing.image]);
        setType(existing.type);
        setTitle(existing.title);
        setPrice(String(existing.price));
        setCondition(existing.condition);
        setCategory(existing.category);
        setDescription(existing.description);
        setPickup(existing.location);
    }, [editId, existing?.id]);

    // Track saved drafts separately from published listings.
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (editId) return;
        try {
            const val = localStorage.getItem('umloop-sell-draft');
            if (val) {
                const draft = JSON.parse(val);
                setType(draft.type);
                setTitle(draft.title);
                setPrice(draft.price);
                setCondition(draft.condition);
                setCategory(draft.category);
                setDescription(draft.description);
                setPickup(draft.pickup)
            }
        } catch { }
        setDraftLoaded(true)
    }, [editId]);

    // Resize photos for the local preview.
    const addPhotos = (files: FileList | null) => {
        if (!files) return;
        Array.from(files).slice(0, 6 - images.length).forEach(f => {
            if (f.size > 4 * 1024 * 1024) {
                inform("Choose images smaller than 4 MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== 'string') return;
                const img = new window.Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setImages(p => [...p, canvas.toDataURL('image/jpeg', .72)].slice(0, 6))
                };
                img.src = reader.result
            };
            reader.readAsDataURL(f)
        });
    };

    // Drafts stay on this device until the listing is published.
    const saveDraft = () => {
        localStorage.setItem('umloop-sell-draft', JSON.stringify({
            type,
            title,
            price,
            condition,
            category,
            description,
            pickup
        }));
        inform("Draft saved on this device.")
    };

    // Validate the form before adding or updating the listing.
    const publish = async (e: FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!title.trim() || !description.trim()) {
            inform("Add a title and description first.");
            return;
        }
        if (type === 'sell' && (Number(price) <= 0 || !Number.isFinite(Number(price)))) {
            inform("Enter a valid price in RM.");
            return;
        }
        if (useApi && images.length === 0) {
            inform("Add a photo of the item.");
            return;
        }
        const id = existing?.id || `listing-${Date.now()}`;
        const listing: Listing = {
            id,
            title: title.trim(),
            type,
            price: type === 'donate' ? 0 : Number(price),
            condition,
            category,
            description: description.trim(),
            location: pickup,
            seller: profile.name,
            tagline: type === 'donate' ? "A little good, passed on" : "Ready for a new home",
            image: images[0] || "/images/desk.jpg",
            images,
            owner: true,
            owner_email: profile.email,
            status: existing?.status ?? "Available",
            reuse_category: type === "donate" ? "Donation" : "Affordable Resale",
            is_test: true
        };
        setSubmitting(true);
        const saved = existing ? await updateListing(id, listing) : await addListing(listing);
        setSubmitting(false);
        if (!saved) return;
        localStorage.removeItem('umloop-sell-draft');
        sessionStorage.setItem('umloop-last-listing', existing ? id : (typeof saved === 'object' ? saved.id : id));
        router.push('/sell/success')
    };

    return <Shell
        title={existing ? 'Edit listing' : 'Post an item'}
        back={existing ? '/activity' : '/home'}
        action={<button className="header-round" aria-label="Close" onClick={() => router.push('/activity')}>
            <X size={20} />
        </button>}
        fixedAction={<PrimaryButton type="submit" disabled={submitting} onClick={() => document.getElementById('listing-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}>
            {existing ? 'Save changes' : 'Publish listing'}
            <ArrowRight size={18} />
        </PrimaryButton>}
    >
        {/* All listing fields submit through one handler. */}
        <form id="listing-form" onSubmit={publish}>
            <div className="form-eyebrow">
                <span>A new home for your pre-loved things.</span>
                <button type="button" className="text-link" onClick={saveDraft}>Save draft</button>
            </div>
            <SectionTitle action={`${images.length} of 6 added`}>Photos</SectionTitle>
            <input
                className="hidden-input"
                type="file"
                accept="image/*"
                multiple
                ref={fileInput}
                onChange={e => addPhotos(e.target.files)}
            />
            {/* Let students preview and remove selected photos. */}
            <div className="photo-uploader">
                {images.map((src, i) => <div className="uploaded-photo" key={i}>
                    <img src={src} alt={`Photo ${i + 1}`} />
                    <button
                        type="button"
                        aria-label={`Remove photo ${i + 1}`}
                        onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                    >
                        <X size={15} />
                    </button>
                </div>)}
                {images.length < 6 && <button type="button" className="upload-placeholder" onClick={() => fileInput.current?.click()}><Camera size={25} />Add photo</button>}
            </div>
            <small className="helper">Show the whole item and any wear. First photo is the cover.</small>
            {/* Choose whether the listing is for sale or donation. */}
            <div className="form-section">
                <h3>How would you like to loop it?</h3>
                <div className="chip-row">
                    <Chip active={type === 'sell'} onClick={() => setType('sell')}>Buy / Sell</Chip>
                    <Chip active={type === 'donate'} onClick={() => setType('donate')}><Gift size={16} /> Donate</Chip>
                </div>
            </div>
            <Field label="Item title">
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="What are you passing on?"
                />
            </Field>
            {/* Use separate fields for price and item condition. */}
            <div className="two-fields">
                {type === 'sell' && <Field label="Price (RM)">
                    <input type="number" value={price} min="1" onChange={e => setPrice(e.target.value)} required />
                </Field>}
                <Field label="Condition">
                    <select value={condition} onChange={e => setCondition(e.target.value as "Like new" | "Good")}>
                        <option value="Like new">Like new</option>
                        <option value="Good">Good condition</option>
                    </select>
                </Field>
            </div>
            <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value as Category)}>
                    <option value="Dorm">Dorm essentials</option>
                    <option value="Books">Books</option>
                    <option value="Tech">Tech</option>
                    <option value="Fashion">Fashion</option>
                </select>
            </Field>
            <Field label="Description">
                <textarea
                    rows={5}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell students about the item and its condition."
                    required
                />
            </Field>
            <Field label="Campus pickup">
                <div className="input-icon">
                    <MapPin size={19} />
                    <select value={pickup} onChange={e => setPickup(e.target.value)}>
                        <option>Central Library</option>
                        <option>Campus library</option>
                        <option>Faculty of Science</option>
                        <option>Student Union</option>
                        <option>Agree in chat</option>
                    </select>
                </div>
                <small>Choose a public space on campus.</small>
            </Field>
            {/* Show the campus pickup reminder below the form. */}
            <div className="safety-inline"><ShieldCheck size={20} /> Arrange handovers in a public place on campus.</div>
        </form>
    </Shell>
}
