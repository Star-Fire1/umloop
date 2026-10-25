export const money = (price: number) => price === 0 ? "Free" : `RM ${price}`;

export const shortName = (name: string) => name.startsWith("Student ")
    ? (name.match(/\d{2}/)?.[0] || "UM")
    : name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

export type PickupOption = { label: string; at: string };

// Pickup times use Malaysia time (UTC+08:00).
// Build the dates shown in the request form.
export function pickupOptions(now: Date = new Date()): PickupOption[] {
    const choices = [
        { days: 1, hour: 14, name: "Tomorrow" },
        { days: 1, hour: 16, name: "Tomorrow" },
        { days: 2, hour: 12, name: "" },
        { days: 3, hour: 14, name: "" }
    ];
    return choices.map(choice => {
        const date = new Date(now.getTime() + choice.days * 86400000);
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kuala_Lumpur",
            year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(date);
        const part = (type: string) => parts.find(item => item.type === type)?.value || "";
        const day = `${part("year")}-${part("month")}-${part("day")}`;
        const dayLabel = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short"
        }).format(date);
        const time = choice.hour === 12 ? "12:00 PM" : `${choice.hour - 12}:00 PM`;
        return {
            label: `${choice.name ? `${choice.name}, ` : ""}${dayLabel} · ${time}`,
            at: `${day}T${String(choice.hour).padStart(2, "0")}:00:00+08:00`
        };
    });
}
