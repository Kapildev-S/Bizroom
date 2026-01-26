
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function CreatePostersLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Poster Studio">{children}</AuthenticatedLayout>;
}
