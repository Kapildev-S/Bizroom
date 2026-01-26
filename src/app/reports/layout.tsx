import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Sales Reports">{children}</AuthenticatedLayout>;
}
