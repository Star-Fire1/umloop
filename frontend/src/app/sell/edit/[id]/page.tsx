import { SellScreen } from "@/features/trading/screens";

// Use the URL listing ID to open the edit form.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <SellScreen editId={id} />;
}
