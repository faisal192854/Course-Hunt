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
      // Get traffic source from URL or referrer
      const urlParams = new URLSearchParams(window.location.search);
      let source = urlParams.get('utm_source') || urlParams.get('ref') || 'Direct';
      
      if (source === 'Direct' && document.referrer) {
        const referrer = new URL(document.referrer).hostname;
        if (referrer.includes('facebook.com')) source = 'Facebook';
        else if (referrer.includes('t.co') || referrer.includes('twitter.com')) source = 'Twitter';
        else if (referrer.includes('instagram.com')) source = 'Instagram';
        else if (referrer.includes('linkedin.com')) source = 'LinkedIn';
        else if (referrer.includes('youtube.com')) source = 'YouTube';
        else if (referrer.includes('google.com')) source = 'Google Search';
        else source = `Referral: ${referrer}`;
      }

      await addDoc(collection(db, CLICKS_COLLECTION), {
        courseId: String(courseId),
        timestamp: serverTimestamp(),
        trafficSource: source
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

  async getTrafficSourceStats() {
    try {
      const querySnapshot = await getDocs(collection(db, CLICKS_COLLECTION));
      const clicks = querySnapshot.docs.map(doc => doc.data());
      
      const counts: Record<string, number> = {};
      clicks.forEach(click => {
        const source = click.trafficSource || 'Direct';
        counts[source] = (counts[source] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, CLICKS_COLLECTION);
      return [];
    }
  }
};
