import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const CLICKS_COLLECTION = 'clicks';

export interface ClickEvent {
  id: string;
  course_id: string | number;
  course_title: string;
  timestamp: string;
  created_at: Timestamp;
}

export const analyticsService = {
  async recordClick(courseId: string | number) {
    try {
      await addDoc(collection(db, CLICKS_COLLECTION), {
        courseId: String(courseId),
        timestamp: serverTimestamp(),
        country: 'Unknown' // Ideally use a geo-location service
      });
      window.dispatchEvent(new Event('analytics-updated'));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, CLICKS_COLLECTION);
    }
  },

  async getClickDataForChart(days: number = 7, courseId?: string | number) {
    try {
      const q = query(collection(db, CLICKS_COLLECTION), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const clicks = querySnapshot.docs.map(doc => doc.data());

      const data: Record<string, number> = {};
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[dateStr] = 0;
      }

      clicks.forEach(click => {
        if (!click.timestamp) return;
        const clickDate = click.timestamp.toDate();
        const dateStr = clickDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (data[dateStr] !== undefined) {
          if (!courseId || String(click.courseId) === String(courseId)) {
            data[dateStr]++;
          }
        }
      });

      return Object.entries(data).map(([name, clicks]) => ({ name, clicks }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, CLICKS_COLLECTION);
      return [];
    }
  },

  async getTopProducts(limitCount: number = 5) {
    try {
      const querySnapshot = await getDocs(collection(db, CLICKS_COLLECTION));
      const clicks = querySnapshot.docs.map(doc => doc.data());
      
      const counts: Record<string, number> = {};
      clicks.forEach(click => {
        counts[click.courseId] = (counts[click.courseId] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([courseId, count]) => ({ courseId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limitCount);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, CLICKS_COLLECTION);
      return [];
    }
  },

  async getCountryStats() {
    try {
      const querySnapshot = await getDocs(collection(db, CLICKS_COLLECTION));
      const clicks = querySnapshot.docs.map(doc => doc.data());
      
      const counts: Record<string, number> = {};
      clicks.forEach(click => {
        const country = click.country || 'Unknown';
        counts[country] = (counts[country] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, CLICKS_COLLECTION);
      return [];
    }
  }
};
