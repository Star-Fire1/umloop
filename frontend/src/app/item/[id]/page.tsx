import { DetailScreen } from "@/features/browse/screens";

// Next.js supplies the item ID from the URL.
// Load an item using the ID from the URL.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <DetailScreen id={id} />;
}
