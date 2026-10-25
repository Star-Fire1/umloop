import { ChatScreen } from "@/features/trading/screens";

// Open a conversation using its URL ID.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <ChatScreen id={id} />;
}
