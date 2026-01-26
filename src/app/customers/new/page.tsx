import { CustomerForm } from "@/components/customers/CustomerForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader 
        title="Add New Customer"
        description="Enter the details for your new customer."
      />
      <CustomerForm />
    </div>
  );
}
