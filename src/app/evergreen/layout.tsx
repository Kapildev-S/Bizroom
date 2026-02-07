
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Evergreen Enterprises | Authorized DTDC Partner",
    description: "Your trusted partner for fast, secure, and reliable courier and logistics services. Domestic and International shipping solutions from Chennai.",
    openGraph: {
        title: "Evergreen Enterprises | Authorized DTDC Partner",
        description: "Fast, secure, and reliable courier solutions. Ship globally with confidence.",
        siteName: "Evergreen Enterprises",
        type: "website",
        locale: "en_IN",
        images: [
            {
                url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=630&fit=crop",
                width: 1200,
                height: 630,
                alt: "Evergreen Enterprises Logistics",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Evergreen Enterprises | Fast & Secure Logistics",
        description: "Authorized DTDC Partner. Domestic & International Courier Services.",
        images: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=630&fit=crop"],
    },
    icons: {
        icon: '/evergreen/icon',
    },
};

export default function EvergreenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
