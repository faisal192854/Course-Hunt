export interface Course {
  id: string | number;
  title: string;
  price: string;
  originalPrice: string;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  additionalChoices?: string;
  sourceUrl?: string;
  about?: string;
  objectives?: string[];
  gallery?: string[];
  fileImages?: string[];
}

export interface Review {
  id: string | number;
  course_id: string | number;
  user_name: string;
  rating: number;
  comment: string;
  image_url?: string;
  created_at: string;
}

export const courses: Course[] = [];
