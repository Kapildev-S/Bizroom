import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Customer Management">{children}</AuthenticatedLayout>;
}
