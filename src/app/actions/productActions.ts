
"use server";

// This file is being deprecated.
// Firestore calls are being moved to client components to ensure
// the user's authentication context is available for security rules.
// This prevents "PERMISSION_DENIED" errors.

// You can safely delete the contents of this file, or the file itself.
// The relevant logic has been moved to:
// - src/components/products/ProductList.tsx
// - src/components/products/ProductForm.tsx
// - src/app/products/[id]/edit/page.tsx
