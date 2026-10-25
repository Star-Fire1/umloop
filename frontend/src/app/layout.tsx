// Set the base HTML layout and site metadata.
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MarketProvider } from "@/lib/store";

export const metadata: Metadata = {

    title: "UMLoop | Buy. Sell. Donate. Repeat.",

    description: "A student-to-student marketplace for the Universiti Malaya community.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f8fb" };

// Keep the store available to every page in the app.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

    return <html lang="en">
        <body>
            <MarketProvider>
                {children}
            </MarketProvider>
        </body>
    </html>;
}
