import { collection, doc, setDoc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { InvoiceProfit } from '../types/profit';

export async function saveInvoiceProfit(userId: string, profitData: InvoiceProfit): Promise<void> {
  const profitRef = doc(db, `users/${userId}/profits`, profitData.invoiceId);
  await setDoc(profitRef, profitData);
}

export async function getInvoiceProfit(userId: string, invoiceId: string): Promise<InvoiceProfit | null> {
  const profitRef = doc(db, `users/${userId}/profits`, invoiceId);
  const snapshot = await getDoc(profitRef);
  if (snapshot.exists()) {
    return snapshot.data() as InvoiceProfit;
  }
  return null;
}

export async function getAllProfits(userId: string): Promise<InvoiceProfit[]> {
  const profitsRef = collection(db, `users/${userId}/profits`);
  const q = query(profitsRef, orderBy('issueDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as InvoiceProfit);
}
