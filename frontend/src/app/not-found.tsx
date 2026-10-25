// Show a fallback page for unknown URLs.
import Link from "next/link";

export default function NotFound() {
    return (
        <main style={{ padding: "3rem", textAlign: "center" }}>
            <h1>Page not found</h1>
            <p>That page does not exist.</p>
            <Link href="/home">Back to Home</Link>
        </main>
    );
}
