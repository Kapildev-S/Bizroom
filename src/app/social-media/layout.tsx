
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function SocialMediaLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Social Media Handling">{children}</AuthenticatedLayout>;
}
