
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Pricing">{children}</AuthenticatedLayout>;
}
