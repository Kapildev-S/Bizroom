'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

const SAMPLE_EVENTS = [
    {
        title: "Tech Summit India 2026",
        category: "Conference",
        imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=85",
        locationType: "physical",
        venueName: "KTPO Convention Centre, Bengaluru",
        venueAddress: "Whitefield, Bengaluru, Karnataka",
        startDate: "2026-08-15",
        startTime: "09:00 AM",
        endDate: "2026-08-16",
        endTime: "06:00 PM",
        timezone: "IST",
        description: "India's largest technology conference bringing together AI pioneers, cloud architects, founders, and tech executives for two days of inspiration, keynotes, and networking.",
        ticketTypes: [
            { id: "t1", name: "Standard Delegate", type: "paid", price: 999, quantity: 500, maxPerUser: 5 },
            { id: "t2", name: "VIP Delegate Pass", type: "paid", price: 2999, quantity: 100, maxPerUser: 2 },
            { id: "t3", name: "Student Pass", type: "paid", price: 499, quantity: 200, maxPerUser: 2 }
        ]
    },
    {
        title: "React & Next.js Masterclass Workshop",
        category: "Workshop",
        imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=85",
        locationType: "physical",
        venueName: "WeWork Galaxy, MG Road, Bengaluru",
        venueAddress: "43 MG Road, Shanthala Nagar, Bengaluru",
        startDate: "2026-08-20",
        startTime: "10:00 AM",
        endDate: "2026-08-20",
        endTime: "05:00 PM",
        timezone: "IST",
        description: "A hands-on, full-day intensive workshop on building modern scalable web applications using React 19, Next.js App Router, server actions, and Tailwind CSS.",
        ticketTypes: [
            { id: "t1", name: "General Seat", type: "paid", price: 1499, quantity: 60, maxPerUser: 3 },
            { id: "t2", name: "Early Bird Seat", type: "paid", price: 999, quantity: 20, maxPerUser: 2 }
        ]
    },
    {
        title: "Neon Horizon Music Concert",
        category: "Concert",
        imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=85",
        locationType: "physical",
        venueName: "Jawaharlal Nehru Stadium, New Delhi",
        venueAddress: "Lodhi Road, New Delhi",
        startDate: "2026-09-05",
        startTime: "06:30 PM",
        endDate: "2026-09-05",
        endTime: "11:30 PM",
        timezone: "IST",
        description: "An electrifying night of live electronic dance music and visual laser light shows featuring top international and national EDM artists.",
        ticketTypes: [
            { id: "t1", name: "General Access", type: "paid", price: 799, quantity: 2000, maxPerUser: 6 },
            { id: "t2", name: "Stage Pit VIP", type: "paid", price: 2499, quantity: 300, maxPerUser: 4 },
            { id: "t3", name: "VIP Lounge Table", type: "paid", price: 4999, quantity: 50, maxPerUser: 2 }
        ]
    },
    {
        title: "Global Founders & Investors Mixer",
        category: "Networking",
        imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=85",
        locationType: "physical",
        venueName: "The St. Regis, Lower Parel, Mumbai",
        venueAddress: "462 Senapati Bapat Marg, Lower Parel, Mumbai",
        startDate: "2026-08-28",
        startTime: "06:00 PM",
        endDate: "2026-08-28",
        endTime: "10:00 PM",
        timezone: "IST",
        description: "Exclusive high-impact networking evening connecting early-stage to Series B startup founders with angel investors, venture capital partners, and industry mentors.",
        ticketTypes: [
            { id: "t1", name: "Founder Ticket", type: "paid", price: 1999, quantity: 80, maxPerUser: 2 },
            { id: "t2", name: "Investor Pass", type: "paid", price: 3999, quantity: 40, maxPerUser: 2 }
        ]
    },
    {
        title: "Sunburn Summer Vibes Festival 2026",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=85",
        locationType: "physical",
        venueName: "Vagator Beach Arena, Goa",
        venueAddress: "Vagator Beach Road, Anjuna, Goa",
        startDate: "2026-10-12",
        startTime: "04:00 PM",
        endDate: "2026-10-14",
        endTime: "11:59 PM",
        timezone: "IST",
        description: "Experience 3 days of sun, sand, and non-stop music with world-class DJs, gourmet food stalls, art installations, and beach vibes.",
        ticketTypes: [
            { id: "t1", name: "Single Day Pass", type: "paid", price: 1999, quantity: 1000, maxPerUser: 4 },
            { id: "t2", name: "3-Day Festival Pass", type: "paid", price: 4500, quantity: 500, maxPerUser: 4 },
            { id: "t3", name: "VIP Oasis Pass", type: "paid", price: 8999, quantity: 150, maxPerUser: 2 }
        ]
    },
    {
        title: "AI & Machine Learning Virtual Bootcamp",
        category: "Workshop",
        imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=85",
        locationType: "online",
        meetingLink: "https://meet.bizroom.in/ai-bootcamp-live",
        startDate: "2026-08-22",
        startTime: "02:00 PM",
        endDate: "2026-08-22",
        endTime: "06:00 PM",
        timezone: "IST",
        description: "Master Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), and fine-tuning open-source models in this live 4-hour interactive online workshop.",
        ticketTypes: [
            { id: "t1", name: "Online Live Access", type: "paid", price: 499, quantity: 500, maxPerUser: 2 },
            { id: "t2", name: "Certificate & Recording Pass", type: "paid", price: 999, quantity: 250, maxPerUser: 2 }
        ]
    },
    {
        title: "National Corporate Cricket League Finals",
        category: "Sports",
        imageUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&q=85",
        locationType: "physical",
        venueName: "M. Chinnaswamy Stadium, Bengaluru",
        venueAddress: "Cubbon Road, Shivaji Nagar, Bengaluru",
        startDate: "2026-09-18",
        startTime: "03:00 PM",
        endDate: "2026-09-18",
        endTime: "10:00 PM",
        timezone: "IST",
        description: "Witness the grand championship final between top corporate cricket teams battling for the annual corporate championship trophy.",
        ticketTypes: [
            { id: "t1", name: "East Gallery Stand", type: "paid", price: 299, quantity: 1500, maxPerUser: 10 },
            { id: "t2", name: "Pavilion Terrace", type: "paid", price: 899, quantity: 400, maxPerUser: 6 },
            { id: "t3", name: "Executive Suite Box", type: "paid", price: 2499, quantity: 50, maxPerUser: 4 }
        ]
    },
    {
        title: "International Design & UX Expo 2026",
        category: "Exhibition",
        imageUrl: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200&q=85",
        locationType: "physical",
        venueName: "Pragati Maidan Hall 5, New Delhi",
        venueAddress: "Mathura Road, Pragati Maidan, New Delhi",
        startDate: "2026-09-25",
        startTime: "10:00 AM",
        endDate: "2026-09-27",
        endTime: "07:00 PM",
        timezone: "IST",
        description: "Discover cutting-edge UI/UX design trends, spatial computing interfaces, branding showcases, and keynote speeches by global design leaders.",
        ticketTypes: [
            { id: "t1", name: "Visitor Day Pass", type: "paid", price: 399, quantity: 800, maxPerUser: 4 },
            { id: "t2", name: "Pro Designer All-Access Pass", type: "paid", price: 1299, quantity: 200, maxPerUser: 2 }
        ]
    },
    {
        title: "Sunset Rooftop Lounge & Cocktail Party",
        category: "Party",
        imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=85",
        locationType: "physical",
        venueName: "Aer Rooftop Lounge, Four Seasons, Mumbai",
        venueAddress: "114 Dr E Moses Rd, Worli, Mumbai",
        startDate: "2026-08-29",
        startTime: "07:30 PM",
        endDate: "2026-08-30",
        endTime: "01:30 AM",
        timezone: "IST",
        description: "An upscale rooftop sunset gathering with handcrafted cocktails, deep house grooves by international guest DJs, and panoramic skyline views.",
        ticketTypes: [
            { id: "t1", name: "Couple Entry (Incl. Cover)", type: "paid", price: 2499, quantity: 100, maxPerUser: 2 },
            { id: "t2", name: "Single Stag Entry", type: "paid", price: 1799, quantity: 50, maxPerUser: 2 }
        ]
    },
    {
        title: "Fintech Leadership Summit 2026",
        category: "Conference",
        imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=85",
        locationType: "physical",
        venueName: "ITC Grand Chola, Guindy, Chennai",
        venueAddress: "63 Mount Road, Guindy, Chennai",
        startDate: "2026-10-02",
        startTime: "09:30 AM",
        endDate: "2026-10-02",
        endTime: "05:30 PM",
        timezone: "IST",
        description: "The premier fintech forum focusing on digital banking, UPI 2.0 innovations, cross-border remittances, AI fraud prevention, and regulatory compliance.",
        ticketTypes: [
            { id: "t1", name: "Delegate Pass", type: "paid", price: 1999, quantity: 300, maxPerUser: 5 },
            { id: "t2", name: "Executive VIP Pass", type: "paid", price: 4999, quantity: 75, maxPerUser: 2 }
        ]
    },
    {
        title: "Cybersecurity & Ethical Hacking Hands-on Lab",
        category: "Workshop",
        imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=85",
        locationType: "physical",
        venueName: "HITEC City Innovation Hub, Hyderabad",
        venueAddress: "Mindspace IT Park, HITEC City, Hyderabad",
        startDate: "2026-09-12",
        startTime: "10:00 AM",
        endDate: "2026-09-12",
        endTime: "04:30 PM",
        timezone: "IST",
        description: "Learn real-world penetration testing, network defense techniques, and web vulnerability assessments in a live supervised sandbox environment.",
        ticketTypes: [
            { id: "t1", name: "Student Seat", type: "paid", price: 799, quantity: 40, maxPerUser: 2 },
            { id: "t2", name: "Professional Seat", type: "paid", price: 1899, quantity: 60, maxPerUser: 4 }
        ]
    },
    {
        title: "Acoustic Unplugged Night with Indie Artists",
        category: "Concert",
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=85",
        locationType: "physical",
        venueName: "The Piano Man Jazz Club, Gurugram",
        venueAddress: "32nd Avenue, Sector 15, Gurugram",
        startDate: "2026-08-23",
        startTime: "08:00 PM",
        endDate: "2026-08-23",
        endTime: "11:00 PM",
        timezone: "IST",
        description: "An intimate, soulful evening featuring acoustic performances by top indie singer-songwriters paired with artisanal food and drinks.",
        ticketTypes: [
            { id: "t1", name: "Seated Pass", type: "paid", price: 699, quantity: 70, maxPerUser: 4 },
            { id: "t2", name: "Standing Area Pass", type: "paid", price: 499, quantity: 50, maxPerUser: 4 }
        ]
    },
    {
        title: "Women in Tech & Leadership Symposium",
        category: "Networking",
        imageUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&q=85",
        locationType: "physical",
        venueName: "Taj MG Road, Bengaluru",
        venueAddress: "41/3 Mahatma Gandhi Rd, Bengaluru",
        startDate: "2026-09-08",
        startTime: "05:00 PM",
        endDate: "2026-09-08",
        endTime: "09:00 PM",
        timezone: "IST",
        description: "Empowering female tech leaders, software engineers, and founders through inspiring keynote addresses, panel discussions, and high-speed networking.",
        ticketTypes: [
            { id: "t1", name: "Standard Registration", type: "paid", price: 499, quantity: 150, maxPerUser: 3 },
            { id: "t2", name: "VIP Guest Pass", type: "paid", price: 1499, quantity: 40, maxPerUser: 2 }
        ]
    },
    {
        title: "Food & Craft Beer Carnival 2026",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=85",
        locationType: "physical",
        venueName: "Mahalaxmi Racecourse Grounds, Mumbai",
        venueAddress: "Keshavrao Khadye Marg, Mahalaxmi, Mumbai",
        startDate: "2026-10-24",
        startTime: "12:00 PM",
        endDate: "2026-10-25",
        endTime: "10:00 PM",
        timezone: "IST",
        description: "Sample over 50 local and international artisanal craft beers alongside gourmet food trucks, live acoustic bands, and outdoor lawn games.",
        ticketTypes: [
            { id: "t1", name: "Early Access Pass", type: "paid", price: 599, quantity: 800, maxPerUser: 6 },
            { id: "t2", name: "Beer Tasting Bundle", type: "paid", price: 1299, quantity: 300, maxPerUser: 4 }
        ]
    },
    {
        title: "E-Sports Championship: Valorant & CS2 Arena",
        category: "Sports",
        imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=85",
        locationType: "physical",
        venueName: "Phoenix Marketcity Event Arena, Pune",
        venueAddress: "Viman Nagar, Pune, Maharashtra",
        startDate: "2026-09-28",
        startTime: "11:00 AM",
        endDate: "2026-09-28",
        endTime: "08:00 PM",
        timezone: "IST",
        description: "Watch premier Indian esports teams clash live on stadium LED screens with professional live casting, gaming gear giveaways, and pro-gamer meet-and-greets.",
        ticketTypes: [
            { id: "t1", name: "Spectator Pass", type: "paid", price: 349, quantity: 600, maxPerUser: 5 },
            { id: "t2", name: "Gamer Fan Pass", type: "paid", price: 899, quantity: 200, maxPerUser: 4 },
            { id: "t3", name: "VIP Front Row", type: "paid", price: 1799, quantity: 50, maxPerUser: 2 }
        ]
    }
];

export async function seed15Events(hostId: string) {
    try {
        console.log(`Starting to seed 15 events using Admin SDK for hostId: ${hostId}`);
        const adminDb = getAdminDb();
        const results = [];

        for (const item of SAMPLE_EVENTS) {
            const docRef = await adminDb.collection("events").add({
                ...item,
                hostId,
                hostName: "BizRoom Featured Host",
                date: item.startDate,
                time: item.startTime,
                venue: item.venueName || "Online Event",
                price: item.ticketTypes[0]?.price.toString() || "0",
                isOnline: item.locationType === "online",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            results.push(docRef.id);
        }

        return { success: true, count: results.length, ids: results };
    } catch (error: any) {
        console.error("Error seeding events:", error);
        return { success: false, error: error.message };
    }
}
