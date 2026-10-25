import type { Listing, Wanted, Thread, PickupRequest } from "@/types/marketplace";

// Sample items for browsing and testing.
// Sample listings for frontend development only.
export const listings: Listing[] = [

    {
        id: "calculus",
        status: "Available",
        reuse_category: "Affordable Resale",
        is_test: true,
        title: "Calculus textbook bundle",
        price: 35,
        type: "sell",
        category: "Books",
        condition: "Like new",
        image: "/images/books.jpg",
        seller: "CHENTIANLIN",
        location: "Central Library",
        tagline: "Ready for your next semester",
        description: "Two calculus textbooks with clean pages and a few pencil notes. Kept in great condition — passing them on as a bundle."
    },

    {
        id: "lamp",
        status: "Reserved",
        reuse_category: "Donation",
        is_test: true,
        title: "Adjustable study lamp",
        price: 0,
        type: "donate",
        category: "Dorm",
        condition: "Good",
        image: "/images/lamp.jpg",
        seller: "Dzaky Arya",
        location: "Campus library",
        tagline: "Still has plenty of late nights in it",
        description: "Moving out and hoping this helps someone study. Adjustable arm, working bulb included, with a few small marks on the base."
    },

    {
        id: "calculator",
        status: "Available",
        reuse_category: "Affordable Resale",
        is_test: true,
        title: "Scientific calculator",
        price: 28,
        type: "sell",
        category: "Tech",
        condition: "Like new",
        image: "/images/calculator.jpg",
        seller: "Aiman Hakim",
        location: "Faculty of Science",
        tagline: "A little help with the numbers",
        description: "Scientific calculator in great working order. Used for one semester, with all buttons in good condition."
    },

    {
        id: "ikea-lamp",
        status: "Available",
        reuse_category: "Affordable Resale",
        is_test: true,
        title: "IKEA study desk lamp",
        price: 25,
        type: "sell",
        category: "Dorm",
        condition: "Good",
        image: "/images/ikea-lamp.jpg",
        seller: "Hu Yanming",
        location: "Kolej Kediaman 4",
        tagline: "A brighter corner for your room",
        description: "Green desk lamp with an adjustable arm. Works well and is ready for a new desk."
    },

    {
        id: "backpack",
        status: "Available",
        reuse_category: "Affordable Resale",
        is_test: true,
        title: "Everyday campus backpack",
        price: 20,
        type: "sell",
        category: "Fashion",
        condition: "Good",
        image: "/images/backpack.jpg",
        seller: "Song Ruian",
        location: "Central Library",
        tagline: "Ready for another semester",
        description: "Sturdy blue backpack with a laptop compartment, front pocket and adjustable straps."
    },

    {
        id: "desk",
        status: "Available",
        reuse_category: "Affordable Resale",
        is_test: true,
        title: "Foldable study table",
        price: 45,
        type: "sell",
        category: "Dorm",
        condition: "Good",
        image: "/images/desk.jpg",
        seller: "Thet Htun Oakar",
        location: "Central Library",
        tagline: "A little more room to study",
        description: "Compact foldable table, great for a small room. Sturdy legs and a few light marks on the top. Selling as I’m rearranging my study space.",
        owner: true,
        owner_email: "24078302@siswa.um.edu.my"
    },

    {
        id: "notes",
        status: "Available",
        reuse_category: "Affordable Resale",
        is_test: true,
        title: "Study notes and revision books",
        price: 12,
        type: "sell",
        category: "Books",
        condition: "Good",
        image: "/images/books.jpg",
        seller: "Nazeera Khan",
        location: "Faculty of Arts",
        tagline: "Share what helped you learn",
        description: "Revision books and notes in good condition. Useful for exam prep."
    },

    {
        id: "extra-lamp",
        status: "Available",
        reuse_category: "Donation",
        is_test: true,
        title: "Desk lamp for a study corner",
        price: 0,
        type: "donate",
        category: "Dorm",
        condition: "Good",
        image: "/images/ikea-lamp.jpg",
        seller: "Nur Aina",
        location: "Central Library",
        tagline: "A new home for something useful",
        description: "A spare desk lamp available for any UM student who needs it."
    }
];
// Sample posts used to test community offers.
export const wantedRequests: Wanted[] = [

    {
        id: "wanted-economics",
        title: "Intro to Economics textbook",
        category: "Books",
        requester: "Nazeef Nuwaisir Khan",
        faculty: "Faculty of Arts",
        year: "Year 1",
        budget: 40,
        donation: false,
        description: "Looking for a pre-loved copy for this semester. Pencil notes are fine!",
        posted: "20 min"
    },

    {
        id: "wanted-rack",
        title: "A small drying rack",
        category: "Dorm",
        requester: "Student 24084524",
        faculty: "Faculty of Science",
        year: "Year 2",
        budget: 0,
        donation: true,
        description: "Just moved into a dorm. A foldable rack would be a big help.",
        posted: "1 hr"
    },

    {
        id: "wanted-calculator",
        title: "Scientific calculator",
        category: "Tech",
        requester: "Student 24051370",
        faculty: "Faculty of Science",
        year: "Year 2",
        budget: 30,
        donation: true,
        description: "A working scientific calculator for my classes would be a great help.",
        posted: "2 hr"
    },

    {
        id: "wanted-lab",
        title: "Lab coat, size M",
        category: "Fashion",
        requester: "Student 23046781",
        faculty: "Faculty of Science",
        year: "Year 3",
        budget: 25,
        donation: true,
        description: "Looking for a clean lab coat for practical sessions.",
        posted: "3 hr"
    },

    {
        id: "wanted-router",
        title: "Spare Wi-Fi router",
        category: "Tech",
        requester: "Student 24028812",
        faculty: "Faculty of Computer Science",
        year: "Year 2",
        budget: 35,
        donation: false,
        description: "Any spare working router for a small room?",
        posted: "5 hr"
    },

    {
        id: "wanted-chair",
        title: "Study chair",
        category: "Dorm",
        requester: "Student 22048611",
        faculty: "Faculty of Engineering",
        year: "Year 4",
        budget: 40,
        donation: true,
        description: "A spare study chair would make my dorm setup easier.",
        posted: "Yesterday"
    },

    {
        id: "wanted-novel",
        title: "English novels",
        category: "Books",
        requester: "Student 23075621",
        faculty: "Faculty of Arts",
        year: "Year 3",
        budget: 15,
        donation: true,
        description: "Interested in secondhand fiction books.",
        posted: "Yesterday"
    },

    {
        id: "wanted-mouse",
        title: "Wireless mouse",
        category: "Tech",
        requester: "Student 24079543",
        faculty: "Faculty of Science",
        year: "Year 2",
        budget: 20,
        donation: false,
        description: "Looking for a used wireless mouse that still works.",
        posted: "2 days"
    }
];
// Sample conversations for inbox and chat screens.
export const initialThreads: Thread[] = [

    {
        id: "dzaky",
        person: "Dzaky Arya",
        listingId: "lamp",
        unread: 1,
        accepted: true,
        messages: [

            {
                id: "d1",
                byMe: true,
                text: "Hi Dzaky Arya! I’d love the lamp for my study desk. Can I collect it at the campus library tomorrow?",
                time: "9:05 AM"
            },

            {
                id: "d2",
                byMe: false,
                text: "Hi Chen Bingyan! Of course — happy it’ll be useful. Tomorrow at 2:00 PM works for me.",
                time: "9:12 AM"
            },

            {
                id: "d3",
                byMe: true,
                text: "Perfect! Central Library public entrance, by the noticeboard?",
                time: "9:18 AM"
            },

            {
                id: "d4",
                byMe: false,
                text: "Yes! See you by the library noticeboard. No payment needed, it’s yours to keep 😊",
                time: "9:24 AM"
            }
        ]
    },

    {
        id: "chentianlin",
        person: "CHENTIANLIN",
        listingId: "calculus",
        unread: 1,
        messages: [
            { id: "c1", byMe: true, text: "Hi! Is your textbook bundle still available?", time: "9:05 AM" },
            { id: "c2", byMe: false, text: "Yes, the bundle is still available.", time: "9:18 AM" }
        ]
    },

    {
        id: "thet",
        person: "Thet Htun Oakar",
        listingId: "desk",
        unread: 0,
        messages: [{ id: "t1", byMe: false, text: "Hi Chen Bingyan, does it fold completely flat?", time: "9:10 AM" }]
    },

    {
        id: "hu",
        person: "Hu Yanming",
        listingId: "ikea-lamp",
        unread: 0,
        messages: [{ id: "h1", byMe: true, text: "Thanks, I’ll have a look!", time: "Yesterday" }]
    },
];
// Sample requests for the activity and tracking screens.
export const initialRequests: PickupRequest[] = [{
    id: "pickup-lamp",
    listingId: "lamp",
    person: "Dzaky Arya",
    message: "I'd love the lamp for my study desk.",
    date: "18 Oct · 2:00 PM",
    location: "Central Library public entrance",
    request_status: "Accepted",
    requester_email: "24078302@siswa.um.edu.my",
    confirmed_by_owner: true,
    is_test: true
}];
