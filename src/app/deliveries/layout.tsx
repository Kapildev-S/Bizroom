
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function DeliveriesLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Delivery Management">{children}</AuthenticatedLayout>;
}

  