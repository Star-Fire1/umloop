import { OfferScreen } from "@/features/browse/screens";

// Pass the wanted-post ID to the offer form.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <OfferScreen id={id} />;
}
