import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { CustomerList } from "@/components/customers/CustomerList";
import { PageHeader } from "@/components/shared/PageHeader";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customers"
        description="Manage your customer information and view their history."
      >
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          <Link href="/customers/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Customer
          </Link>
        </Button>
      </PageHeader>
      
      <CustomerList />
    </div>
  );
}
