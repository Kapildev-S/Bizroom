import { PageHeader } from "@/components/shared/PageHeader";
import { PricingSection } from "@/components/shared/PricingSection";

export default function PricingPage() {
    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <PageHeader
                title="Simple, Transparent Pricing"
                description="Choose the plan that fits your business needs."
            />
            <PricingSection />
        </div>
    );
}
