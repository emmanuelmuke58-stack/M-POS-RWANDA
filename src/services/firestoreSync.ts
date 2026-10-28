import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Sale, Customer, AuditLog, HeldSale, BusinessSettings, UserAccount } from '../types';

export interface FirebaseSyncStatus {
  isConfigured: boolean;
  isOnline: boolean;
  lastSynced: Date | null;
  syncError: string | null;
}

/**
 * Fetch products from Firestore.
 */
export async function fetchProductsFromCloud(): Promise<Product[]> {
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    const products: Product[] = [];
    snapshot.forEach((docSnap: any) => {
      products.push(docSnap.data() as Product);
    });
    return products;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'products');
    return [];
  }
}

/**
 * Save or update a product in Firestore.
 */
export async function syncProductToCloud(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a product from Firestore.
 */
export async function deleteProductFromCloud(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save a completed sale to Firestore.
 */
export async function syncSaleToCloud(sale: Sale): Promise<void> {
  const path = `sales/${sale.id}`;
  try {
    await setDoc(doc(db, 'sales', sale.id), sale);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Fetch sales history from Firestore.
 */
export async function fetchSalesFromCloud(): Promise<Sale[]> {
  try {
    const colRef = collection(db, 'sales');
    const snapshot = await getDocs(colRef);
    const sales: Sale[] = [];
    snapshot.forEach((docSnap: any) => {
      sales.push(docSnap.data() as Sale);
    });
    return sales;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'sales');
    return [];
  }
}

/**
 * Record an audit log entry in Firestore.
 */
export async function syncAuditLogToCloud(log: AuditLog): Promise<void> {
  const path = `auditLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'auditLogs', log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Save held sale to Firestore.
 */
export async function syncHeldSaleToCloud(heldSale: HeldSale): Promise<void> {
  const path = `heldSales/${heldSale.id}`;
  try {
    await setDoc(doc(db, 'heldSales', heldSale.id), heldSale);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a held sale from Firestore.
 */
export async function deleteHeldSaleFromCloud(heldSaleId: string): Promise<void> {
  const path = `heldSales/${heldSaleId}`;
  try {
    await deleteDoc(doc(db, 'heldSales', heldSaleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Sync customer to Firestore.
 */
export async function syncCustomerToCloud(customer: Customer): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), customer, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync store business settings to Firestore.
 */
export async function syncSettingsToCloud(settings: BusinessSettings): Promise<void> {
  const path = 'settings/general';
  try {
    await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Seed initial catalog to Firestore in bulk if empty.
 */
export async function seedInitialFirestoreData(
  initialProducts: Product[],
  initialCustomers: Customer[],
  initialSettings: BusinessSettings
): Promise<boolean> {
  try {
    const existing = await getDocs(query(collection(db, 'products'), limit(1)));
    if (!existing.empty) {
      return false; // Already populated
    }

    const batch = writeBatch(db);
    for (const p of initialProducts) {
      batch.set(doc(db, 'products', p.id), p);
    }
    for (const c of initialCustomers) {
      batch.set(doc(db, 'customers', c.id), c);
    }
    batch.set(doc(db, 'settings', 'general'), initialSettings);

    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Initial cloud seed skipped or offline:', error);
    return false;
  }
}
