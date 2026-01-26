
import { BillEaseLogo } from "@/components/icons/BillEaseLogo";
import Link from "next/link";

export default function PublicRechargeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30">
        <header className="container mx-auto py-6 px-4 md:px-6 flex justify-between items-center">
            <Link href="/">
              <BillEaseLogo className="h-8 w-auto"/>
            </Link>
        </header>
        <main className="flex-grow flex items-center justify-center p-4 md:p-6">
            {children}
        </main>
    </div>
  );
}
