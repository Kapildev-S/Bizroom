
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Daily Ledger">{children}</AuthenticatedLayout>;
}
