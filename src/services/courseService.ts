import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Course, Review } from '../data/courses';

const COURSES_COLLECTION = 'courses';
const REVIEWS_COLLECTION = 'reviews';

export const courseService = {
  async getCourses(): Promise<Course[]> {
    try {
      const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as unknown as Course[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      return [];
    }
  },

  async getCourseById(id: string | number): Promise<Course | undefined> {
    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as unknown as Course;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return undefined;
    }
  },

  async updateCourse(updatedCourse: Course) {
    const path = `${COURSES_COLLECTION}/${updatedCourse.id}`;
    try {
      const { id, ...data } = updatedCourse;
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { error };
    }
  },

  async addCourse(newCourse: Omit<Course, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, COURSES_COLLECTION), {
        ...newCourse,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const courseWithId = { ...newCourse, id: docRef.id } as unknown as Course;
      return { data: [courseWithId], error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COURSES_COLLECTION);
      return { data: null, error };
    }
  },

  async deleteCourse(id: string | number) {
    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      await deleteDoc(docRef);
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { error };
    }
  },

  async getReviews(courseId: string | number): Promise<Review[]> {
    try {
      const q = query(
        collection(db, REVIEWS_COLLECTION), 
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const allReviews = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as unknown as Review[];
      
      return allReviews.filter(r => String(r.course_id) === String(courseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
      return [];
    }
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'>) {
    try {
      const newReviewData = {
        ...review,
        created_at: new Date().toISOString(), // Keeping ISO string for compatibility or use serverTimestamp
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), newReviewData);
      const newReview: Review = {
        ...newReviewData,
        id: docRef.id
      } as unknown as Review;

      // Update course rating and count
      const reviews = await this.getReviews(review.course_id);
      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

      const courseRef = doc(db, COURSES_COLLECTION, String(review.course_id));
      await updateDoc(courseRef, {
        rating: averageRating,
        reviews: reviews.length
      });

      return { data: newReview, error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, REVIEWS_COLLECTION);
      return { data: null, error };
    }
  },

  subscribeToCourses(callback: (courses: Course[]) => void) {
    const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as unknown as Course[];
      callback(courses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
    });

    return unsubscribe;
  }
};
