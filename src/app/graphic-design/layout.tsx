
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function GraphicDesignLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout pageTitle="Graphic Design">{children}</AuthenticatedLayout>;
}
