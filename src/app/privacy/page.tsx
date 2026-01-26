import { PageHeader } from "@/components/shared/PageHeader";

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto py-12 px-4 md:px-6 max-w-4xl">
            <PageHeader
                title="Privacy Policy"
                description="Last Updated: January 2026"
            />

            <div className="mt-8 space-y-6 text-muted-foreground">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, phone number, and business details.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to operate, maintain, and improve our services, to process transactions, and to communicate with you about your account and our services.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Security</h2>
                    <p>
                        We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Third-Party Services</h2>
                    <p>
                        We may use third-party services (such as payment processors) that collect, use, and share your information in accordance with their own privacy policies.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at info@bizroom.in.
                    </p>
                </section>
            </div>
        </div>
    );
}
