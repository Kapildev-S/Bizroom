
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function SmsMarketingLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="SMS Marketing">{children}</AuthenticatedLayout>;
}
