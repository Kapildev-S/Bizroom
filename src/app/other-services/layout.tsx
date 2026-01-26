
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function OtherServicesLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Website Builder">{children}</AuthenticatedLayout>;
}
