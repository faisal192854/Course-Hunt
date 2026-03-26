import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import { cartService } from './services/cartService';
import { courseService } from './services/courseService';
import { Course } from './data/courses';
import { Toaster, toast } from 'sonner';

export default function About() {
  const [cartCount, setCartCount] = useState<number>(cartService.getCartCount());
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<Course[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      setCartCount(cartService.getCartCount());
      const allCourses = await courseService.getCourses();
      const items = cartService.getCartItems()
        .map(cartId => allCourses.find(c => c.id === cartId))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };

    const handleCartUpdate = async () => {
      setCartCount(cartService.getCartCount());
      const allCourses = await courseService.getCourses();
      const items = cartService.getCartItems()
        .map(cartId => allCourses.find(c => c.id === cartId))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    
    loadInitialData();
    
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors" style={{ textDecoration: 'none' }}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#EBC351] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 md:pt-16 pb-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#EBC351]/10 rounded-full mb-8">
            <ShieldCheck className="w-10 h-10 text-[#EBC351]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">About course-hunt</h1>
          <div className="bg-gradient-to-r from-[#EBC351]/20 to-transparent p-8 rounded-3xl border-2 border-[#EBC351]/30 shadow-xl mb-12">
            <p className="text-2xl md:text-3xl font-bold text-[#EBC351]">
              7-day money-back guarantee
            </p>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              We are committed to your success. If you're not satisfied with your learning experience, we offer a full refund within the first 7 days of purchase. No questions asked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-16">
            <div className="bg-white p-6 rounded-2xl border-2 border-[#EBC351]/10 shadow-sm hover:border-[#EBC351]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3 text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EBC351]"></span>
                Our Mission
              </h3>
              <p className="text-gray-600">
                To provide high-quality, accessible education to everyone, everywhere. We believe that learning should be a lifelong journey.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-[#EBC351]/10 shadow-sm hover:border-[#EBC351]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3 text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EBC351]"></span>
                Quality Content
              </h3>
              <p className="text-gray-600">
                Every course on our platform is carefully vetted to ensure it meets our high standards for instruction and practical value.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-8 rounded-3xl border-2 border-[#EBC351]/20 mb-12 text-left">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-[#EBC351] text-black p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </span>
              Payment Methods
            </h2>
            <p className="text-gray-600 mb-6">
              We accept a wide range of payment methods to make your learning journey as smooth as possible. You can pay via:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['Bkash', 'Binance', 'Credit/Debit Card'].map((method) => (
                <div key={method} className="bg-white p-4 rounded-xl border border-[#EBC351]/20 text-center font-bold text-gray-800 shadow-sm hover:border-[#EBC351] transition-colors">
                  {method}
                </div>
              ))}
            </div>
          </div>

          {/* New Review Request Section */}
          <div className="bg-[#EBC351] p-10 rounded-3xl border-4 border-black mb-12 text-center shadow-2xl relative overflow-hidden">
            <motion.div 
              className="absolute top-4 left-4"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </motion.div>
            <motion.div 
              className="absolute bottom-4 right-4 rotate-180"
              animate={{ x: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </motion.div>

            <h2 className="text-3xl font-black mb-4 text-black uppercase tracking-tighter">
              We Value Your Voice!
            </h2>
            <p className="text-black font-bold text-lg mb-8 max-w-xl mx-auto leading-tight">
              Did you receive your course? How was your experience? Share your personal review with us and help other students choose the best!
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const phoneNumber = "+8801314493061";
                const message = "Hi! I'd like to share my review about the course I received.";
                window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="bg-black text-[#EBC351] px-10 py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-3 mx-auto"
            >
              Submit Your Review
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/>
              </svg>
            </motion.button>
          </div>

          <div className="bg-white p-8 rounded-3xl border-2 border-[#EBC351] mb-12 text-left shadow-xl">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <span className="bg-[#25D366] text-white p-2 rounded-lg">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </span>
              How to Order via WhatsApp
            </h2>
            <div className="space-y-6">
              {[
                { step: 1, title: "Choose Your Course", desc: "Browse our catalog and find the course you want to enroll in." },
                { step: 2, title: "Click WhatsApp Button", desc: "On the course detail page or in your cart, click the 'WhatsApp' or 'Checkout via WhatsApp' button." },
                { step: 3, title: "Send the Message", desc: "A pre-filled message with course details will be ready. Just hit send to our official number." },
                { step: 4, title: "Complete Payment", desc: "Our team will provide payment instructions for your preferred method (Bkash, Binance, etc.)." },
                { step: 5, title: "Receive Course Link", desc: "Once payment is verified, you will receive your course access link directly on WhatsApp instantly." }
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#EBC351] text-black rounded-full flex items-center justify-center font-black">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t-2 border-gray-200 bg-white py-10 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 font-medium">© 2023 course-hunt. All rights reserved.</p>
        </div>
      </footer>

      <Toaster position="top-center" />
      
      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsCartOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-[#EBC351]" />
                  Your Cart
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-6">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Your cart is empty</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-[#EBC351] font-bold hover:underline"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl">
                        <img 
                          src={item.image || null} 
                          alt={item.title} 
                          className="w-16 h-16 object-cover rounded-xl"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm line-clamp-1">{item.title}</h4>
                          <p className="text-[#EBC351] font-bold">{item.price}</p>
                        </div>
                        <button 
                          onClick={() => {
                            cartService.removeFromCart(item.id);
                            toast.success('Removed from cart');
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 font-medium">Total Items:</span>
                    <span className="text-xl font-bold">{cartItems.length}</span>
                  </div>
                  <button 
                    className="w-full bg-[#EBC351] text-black py-4 rounded-2xl font-bold shadow-lg shadow-[#EBC351]/20 hover:shadow-xl hover:shadow-[#EBC351]/30 transition-all"
                    onClick={() => {
                      toast.success('Checkout functionality coming soon!');
                    }}
                  >
                    Checkout Now
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
