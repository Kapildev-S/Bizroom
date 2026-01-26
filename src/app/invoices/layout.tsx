import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Invoice Management">{children}</AuthenticatedLayout>;
}
