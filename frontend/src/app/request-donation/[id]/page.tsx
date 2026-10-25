import { RequestFormScreen } from "@/features/trading/screens";

// Start a donation request for this listing.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <RequestFormScreen id={id} donation={true} />;
}
