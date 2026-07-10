import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const customersCollection = collection(db, "customers");
const productsCollection = collection(db, "products");
const ordersCollection = collection(db, "orders");
const invoicesCollection = collection(db, "invoices");
const companySettingsCollection = collection(db, "companySettings");
const invoiceCounterCollection = collection(db, "invoiceCounter");
const priceListsCollection = collection(db, "priceLists");
const customTranslationsDoc = doc(db, "customTranslations", "overrides");

export {
  auth,
  db,
  storage,
  customersCollection,
  productsCollection,
  ordersCollection,
  invoicesCollection,
  companySettingsCollection,
  invoiceCounterCollection,
  priceListsCollection,
  customTranslationsDoc,
};
export default app;