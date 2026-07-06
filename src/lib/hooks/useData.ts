import useSWR, { mutate } from 'swr';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc, Timestamp, where } from 'firebase/firestore';
import type { Invoice, Customer, AppSettings, Product } from '@/lib/mockData';
import { useAuth } from '@/lib/useAuth';

// Helper to invalidate SWR cache keys
export const invalidateCache = (userId: string, key: 'invoices' | 'customers' | 'products' | 'settings') => {
  mutate(`/${userId}/${key}`);
};

export function useInvoices() {
  const { user, loading: authLoading } = useAuth();
  
  const fetcher = async () => {
    if (!user) return [];
    const q = query(collection(db, `users/${user.uid}/invoices`), orderBy("issueDate", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        issueDate: typeof data.issueDate === 'string' ? data.issueDate : (data.issueDate?.toDate ? data.issueDate.toDate().toISOString() : new Date().toISOString()),
        dueDate: typeof data.dueDate === 'string' ? data.dueDate : (data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString()),
      } as Invoice;
    });
  };

  const { data, error, isLoading, mutate } = useSWR(
    user && !authLoading ? `/${user.uid}/invoices` : null,
    fetcher,
    {
        revalidateOnFocus: false, // Prevents aggressive refetching if user changes tabs frequently, keeping it snappy.
        dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    invoices: data || [],
    isLoading: isLoading || authLoading,
    isError: error,
    mutate
  };
}

export function useCustomers() {
  const { user, loading: authLoading } = useAuth();
  
  const fetcher = async () => {
    if (!user) return [];
    const q = query(collection(db, `users/${user.uid}/customers`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  };

  const { data, error, isLoading, mutate } = useSWR(
    user && !authLoading ? `/${user.uid}/customers` : null,
    fetcher,
    {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    }
  );

  return {
    customers: data || [],
    isLoading: isLoading || authLoading,
    isError: error,
    mutate
  };
}

export function useProducts() {
  const { user, loading: authLoading } = useAuth();
  
  const fetcher = async () => {
    if (!user) return [];
    const q = query(collection(db, `users/${user.uid}/products`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  };

  const { data, error, isLoading, mutate } = useSWR(
    user && !authLoading ? `/${user.uid}/products` : null,
    fetcher,
    {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    }
  );

  return {
    products: data || [],
    isLoading: isLoading || authLoading,
    isError: error,
    mutate
  };
}

export function useSettings() {
  const { user, loading: authLoading } = useAuth();
  
  const fetcher = async () => {
    if (!user) return null;
    const docRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
    return null;
  };

  const { data, error, isLoading, mutate } = useSWR(
    user && !authLoading ? `/${user.uid}/settings` : null,
    fetcher,
    {
        revalidateOnFocus: false,
        dedupingInterval: 600000, // 10 minutes (settings rarely change)
    }
  );

  return {
    settings: data,
    isLoading: isLoading || authLoading,
    isError: error,
    mutate
  };
}
