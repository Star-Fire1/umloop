"use client";
import { useMarket } from "@/lib/store";
import { PageIntro, Shell } from "@/components/ui/MarketplaceUI";

// Store which updates the student wants to receive.
export function NotificationsScreen() {
    // Read current switches from the account settings.
    const { settings, updateSettings } = useMarket();
    return <Shell title="Notification preferences" back="/profile">
        <PageIntro title="Stay in the loop." subtitle="Choose which updates you want to hear about." />
        <div className="settings-card white-card">
            {/* Each switch updates one notification setting. */}
            {([
                { key: 'notifyMessages', title: 'New messages', detail: 'When another student sends a message' },
                { key: 'notifyRequests', title: 'Item requests', detail: 'When someone requests a listing' },
                { key: 'notifyPickup', title: 'Pickup reminders', detail: 'Updates about planned meetups' }
            ] as const).map(({ key, title, detail }) => <label key={key} className="setting-toggle">
                <span>
                    <b>
                        {title}
                    </b>
                    <small>
                        {detail}
                    </small>
                </span>
                <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={e => updateSettings({ [key]: e.target.checked })}
                />
            </label>)}
        </div>
        <p className="helper">These preferences are saved locally. Push and email delivery need the backend.</p>
    </Shell>
}
