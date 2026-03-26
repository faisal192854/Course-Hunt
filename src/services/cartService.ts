import { Course } from '../data/courses';

const CART_STORAGE_KEY = 'course_hunt_cart';

export const cartService = {
  getCartItems(): (string | number)[] {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addToCart(courseId: string | number) {
    const items = this.getCartItems();
    if (!items.includes(courseId)) {
      items.push(courseId);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event('cart-updated'));
    }
  },

  removeFromCart(courseId: string | number) {
    const items = this.getCartItems().filter(id => id !== courseId);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('cart-updated'));
  },

  getCartCount(): number {
    return this.getCartItems().length;
  },

  isInCart(courseId: string | number): boolean {
    return this.getCartItems().includes(courseId);
  }
};
