import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { PageHeader } from "@/components/shared/PageHeader";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
       <PageHeader 
        title="Invoices"
        description="Create, track, and manage all your invoices."
      >
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          <Link href="/invoices/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Link>
        </Button>
      </PageHeader>
      
      <InvoiceList />
    </div>
  );
}
