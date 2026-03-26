import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const SETTINGS_COLLECTION = 'settings';
const APP_SETTINGS_DOC = 'app';
const ANNOUNCEMENTS_DOC = 'announcements';
const CATEGORIES_DOC = 'categories';
const COUPONS_COLLECTION = 'coupons';

export interface Coupon {
  code: string;
  discount: number;
  isActive: boolean;
}

export interface AppSettings {
  announcement: string;
  categories: string[];
  coupons: Coupon[];
}

export const settingsService = {
  getDefaultSettings(): AppSettings {
    return {
      announcement: '',
      categories: ['Development', 'Design', 'Marketing', 'Business'],
      coupons: []
    };
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          announcement: data.announcement || '',
          categories: data.categories || this.getDefaultSettings().categories,
          coupons: data.coupons || []
        };
      }
      return this.getDefaultSettings();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${APP_SETTINGS_DOC}`);
      return this.getDefaultSettings();
    }
  },

  async updateSettings(settings: AppSettings) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
      await setDoc(docRef, { 
        ...settings,
        updatedAt: serverTimestamp()
      });
      window.dispatchEvent(new Event('settings-updated'));
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${APP_SETTINGS_DOC}`);
      return { error };
    }
  }
};
