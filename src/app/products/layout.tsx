import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Product & Service Management">{children}</AuthenticatedLayout>;
}
