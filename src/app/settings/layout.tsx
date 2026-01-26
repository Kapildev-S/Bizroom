import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Settings">{children}</AuthenticatedLayout>;
}
