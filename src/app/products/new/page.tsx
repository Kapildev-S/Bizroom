import { ProductForm } from "@/components/products/ProductForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewProductPage() {
  return (
    <div>
      <PageHeader 
        title="Add New Product/Service"
        description="Enter the details for your new offering."
      />
      <ProductForm />
    </div>
  );
}
