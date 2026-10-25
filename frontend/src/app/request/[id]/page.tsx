import { RequestTrackingScreen } from "@/features/trading/screens";

// Load the tracking screen for the request in the URL.
// Load the selected request and its pickup progress.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <RequestTrackingScreen id={id} />;
}
