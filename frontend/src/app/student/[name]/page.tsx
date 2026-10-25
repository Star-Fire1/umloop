import { PublicStudentScreen } from "@/features/account/screens";

// Show listings by the student named in the URL.
export default async function Page({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;

    return <PublicStudentScreen name={name} />;
}
