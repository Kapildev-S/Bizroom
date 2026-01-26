
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function BrandingLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Branding Services">{children}</AuthenticatedLayout>;
}
