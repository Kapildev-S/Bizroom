
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function StaffManagementLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Staff Management">{children}</AuthenticatedLayout>;
}
