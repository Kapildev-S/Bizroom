import { PageHeader } from "@/components/shared/PageHeader";

export default function RefundPolicyPage() {
    return (
        <div className="container mx-auto py-12 px-4 md:px-6 max-w-4xl">
            <PageHeader
                title="Refund Policy"
                description="Last Updated: January 2026"
            />

            <div className="mt-8 space-y-6 text-muted-foreground">
                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Subscription Refunds</h2>
                    <p>
                        We offer a satisfaction guarantee. If you are not satisfied with your subscription, you may request a refund within <strong>7 days</strong> of your initial purchase.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. Processing Time</h2>
                    <p>
                        Approved refunds are typically processed within 5-7 business days and credited back to the original method of payment.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Non-Refundable Items</h2>
                    <p>
                        Certain services, such as one-time setup fees or custom development work, are non-refundable once the service has been delivered.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Cancellation</h2>
                    <p>
                        You may cancel your subscription at any time. Your access will continue until the end of the current billing cycle. No partial refunds are provided for mid-cycle cancellations after the 7-day window.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Contact Us</h2>
                    <p>
                        To request a refund or for any billing-related queries, please contact our support team at info@bizroom.in.
                    </p>
                </section>
            </div>
        </div>
    );
}
