import { PageHeader } from "@/components/shared/PageHeader";

export default function TermsPage() {
    return (
        <div className="container mx-auto py-12 px-4 md:px-6 max-w-4xl">
            <PageHeader
                title="Terms & Conditions"
                description="Last Updated: January 2026"
            />

            <div className="mt-8 space-y-6 text-muted-foreground">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using BizRoom, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, strictly do not use our services.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. Use of Service</h2>
                    <p>
                        You agree to use BizRoom only for lawful purposes and in accordance with these Terms. You are responsible for all activity that occurs under your account.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Subscription and Billing</h2>
                    <p>
                        Certain features of the Service may require a paid subscription. You agree to pay all fees associated with your chosen subscription plan.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Intellectual Property</h2>
                    <p>
                        The Service and its original content, features, and functionality are and will remain the exclusive property of BizRoom and its licensors.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Termination</h2>
                    <p>
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">6. Limitation of Liability</h2>
                    <p>
                        In no event shall BizRoom, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.
                    </p>
                </section>
            </div>
        </div>
    );
}
