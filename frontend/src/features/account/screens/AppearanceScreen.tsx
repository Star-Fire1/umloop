"use client";
import { Check, Moon, Settings, Sun } from "lucide-react";
import { useMarket } from "@/lib/store";
import { PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Switch the app colour theme.
export function AppearanceScreen() {
    // Read the selected theme from shared settings.
    const { settings, updateSettings } = useMarket();
    return <Shell title="Appearance" back="/profile">
        <PageIntro title="Make it yours." subtitle="Choose the look that works best for you." />
        <div className="settings-card white-card">
            <h3>Appearance</h3>
            {/* Each option updates the shared theme setting. */}
            {(['light', 'dark', 'system'] as const).map(v => <button className="setting-option" onClick={() => updateSettings({ theme: v })} key={v}>
                {v === 'light' ? <Sun size={21} /> : v === 'dark' ? <Moon size={21} /> : <Settings size={21} />}
                <span>
                    <b>
                        {v[0].toUpperCase() + v.slice(1)}
                    </b>
                    <small>
                        {v === 'system' ? 'Follow your device setting' : `${v[0].toUpperCase() + v.slice(1)} colours across UMLoop`}
                    </small>
                </span>
                {settings.theme === v ? <Check size={19} /> : <span />}
            </button>)}
        </div>
    </Shell>
}
