import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Info, Target, CheckCircle2, ShoppingCart, Plus, Check, X, Tag, Trash2, Star, Camera, MessageSquare, Send } from 'lucide-react';
import { courseService } from './services/courseService';
import { Course, Review } from './data/courses';
import { cartService } from './services/cartService';
import { analyticsService } from './services/analyticsService';
import { settingsService, AppSettings, Coupon } from './services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import './CourseDetail.css';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [cartCount, setCartCount] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<Course[]>([]);
  const [settings, setSettings] = useState<AppSettings>(settingsService.getDefaultSettings());
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({
    user_name: '',
    rating: 5,
    comment: '',
    image_url: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const [fetchedCourse, fetchedSettings, allCourses, fetchedReviews] = await Promise.all([
        courseService.getCourseById(courseId || ''),
        settingsService.getSettings(),
        courseService.getCourses(),
        courseId ? courseService.getReviews(courseId) : Promise.resolve([])
      ]);
      setCourse(fetchedCourse);
      setSettings(fetchedSettings);
      setReviews(fetchedReviews);
      setCartCount(cartService.getCartCount());
      
      const items = cartService.getCartItems()
        .map(cartId => allCourses.find(c => c.id === cartId))
        .filter((c): c is Course => !!c);
      setCartItems(items);

      if (courseId) {
        analyticsService.recordClick(courseId);
      }
    };

    const handleCartUpdate = async () => {
      setCartCount(cartService.getCartCount());
      const allCourses = await courseService.getCourses();
      const items = cartService.getCartItems()
        .map(cartId => allCourses.find(c => c.id === cartId))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };
    
    const handleCoursesUpdate = async () => {
      const [fetchedCourse, fetchedReviews] = await Promise.all([
        courseService.getCourseById(courseId || ''),
        courseId ? courseService.getReviews(courseId) : Promise.resolve([])
      ]);
      setCourse(fetchedCourse);
      setReviews(fetchedReviews);
    };

    const handleSettingsUpdate = async () => {
      const fetchedSettings = await settingsService.getSettings();
      setSettings(fetchedSettings);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('courses-updated', handleCoursesUpdate);
    window.addEventListener('settings-updated', handleSettingsUpdate);
    
    loadInitialData();
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('courses-updated', handleCoursesUpdate);
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, [id]);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course not found</h2>
          <Link to="/" className="text-[#D4AF37] hover:underline font-medium">Return to Home</Link>
        </div>
      </div>
    );
  }

  const galleryImages = course.gallery && course.gallery.length > 0 
    ? [course.image, ...course.gallery] 
    : [course.image];

  const fileProofs = course.fileImages && course.fileImages.length > 0
    ? course.fileImages
    : [];

  const handleWhatsAppClick = () => {
    const phoneNumber = "+8801314493061";
    const currentUrl = window.location.href;
    const message = `Course Name: ${course.title}\nPrice: ${course.price}\nLink: ${currentUrl}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setReviewImagePreview(base64String);
        setNewReview(prev => ({ ...prev, image_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    if (!newReview.user_name || !newReview.comment) {
      toast.error('Please fill in your name and comment');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const result = await courseService.addReview({
        course_id: courseId,
        user_name: newReview.user_name,
        rating: newReview.rating,
        comment: newReview.comment,
        image_url: newReview.image_url
      });

      if (result.error) throw result.error;

      toast.success('Review submitted successfully!');
      setNewReview({ user_name: '', rating: 5, comment: '', image_url: '' });
      setReviewImagePreview(null);
      
      // Refresh reviews
      const updatedReviews = await courseService.getReviews(courseId);
      setReviews(updatedReviews);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="course-detail-page">
      {/* Announcement Bar */}
      {settings.announcement && (
        <div className="relative z-40 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-2 px-4 text-center text-xs font-mono font-bold tracking-widest uppercase overflow-hidden">
          {settings.announcement}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors" style={{ textDecoration: 'none' }}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Courses</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/about" className="text-gray-600 hover:text-gray-900 font-medium text-sm" style={{ textDecoration: 'none' }}>
              About
            </Link>
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="course-container">
        <section className="page-title">
          <h1>{course.title}</h1>
        </section>

        <section className="media-gallery">
          <h2>Course Preview</h2>
          <div className="hero-image">
            <img src={galleryImages[activeImage] || null} alt="Course Hero" />
          </div>
          <div className="carousel">
            {galleryImages.map((img, idx) => (
              <div 
                key={idx} 
                className="carousel-item"
                onClick={() => setActiveImage(idx)}
                style={{ border: activeImage === idx ? '2px solid #0052CC' : 'none' }}
              >
                <img src={img || null} alt={`Thumbnail ${idx + 1}`} />
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Info className="h-5 w-5" />
              About This Course
            </h2>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-lg leading-relaxed text-gray-700">
              {course.about || ""}
            </p>
            
            <div className="mt-12 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/20">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Target className="h-5 w-5" />
                  Course Objectives
                </h3>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(course.objectives || []).map((objective, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-white p-4 transition-all hover:scale-[1.02] hover:shadow-md"
                    >
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-gray-800">{objective}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {fileProofs.length > 0 && (
          <section className="file-proofs">
            <h2>Inside Look: Course Files</h2>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '20px' }}>See exactly what you'll get access to instantly after purchase.</p>
            <div className="proofs-grid">
              {fileProofs.map((img, idx) => (
                <img key={idx} src={img || null} alt={`Course File Proof ${idx + 1}`} className="proof-image" />
              ))}
            </div>
          </section>
        )}



        <section className="pricing">
          <h2>Course Price</h2>
          <div className="price-container">
            <span className="original-price">{course.originalPrice}</span>
            <span className="price-amount">{course.price}</span>
          </div>
        </section>

        <section className="cta-section">
          <div className="flex flex-col gap-6 items-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <button 
                onClick={() => {
                  if (!cartService.isInCart(course.id)) {
                    cartService.addToCart(course.id);
                    toast.success('Added to cart!');
                  } else {
                    setIsCartOpen(true);
                  }
                }} 
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all shadow-md active:scale-95",
                  cartService.isInCart(course.id)
                    ? "bg-gray-100 text-gray-600 border border-gray-200"
                    : "bg-[#D4AF37] text-black hover:shadow-lg hover:-translate-y-0.5"
                )}
              >
                {cartService.isInCart(course.id) ? (
                  <>
                    <Check className="w-5 h-5" />
                    In Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </>
                )}
              </button>
              
              <button 
                onClick={handleWhatsAppClick} 
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#20ba5a] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </button>

              <a 
                href={course.sourceUrl || "#"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink className="w-5 h-5" />
                Main Course Source
              </a>
            </div>
          </div>

          <div className="cta-info">
            <h3>How to Purchase</h3>
            <div className="info-box">
              <p>Clicking the WhatsApp button will open a chat with our team.</p>
              <p>The following message will be pre-filled for you:</p>
              <div className="message-template">
                Course Name: {course.title}<br/>
                Price: {course.price}<br/>
                Link: {window.location.href}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="mt-20 mb-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-[#D4AF37]" />
                Student Reviews
              </h2>
              <p className="text-gray-500 mt-1">Real feedback from students who took this course</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm self-start md:self-center">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= Math.round(course.rating) ? "fill-[#ffa534] text-[#ffa534]" : "fill-gray-100 text-gray-100"
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-black text-xl text-gray-900">{course.rating}</span>
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">{reviews.length} total</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Review Form */}
            <div className="lg:col-span-4">
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Share your experience</h3>
                <form onSubmit={handleSubmitReview} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input
                      type="text"
                      value={newReview.user_name}
                      onChange={(e) => setNewReview(prev => ({ ...prev, user_name: e.target.value }))}
                      className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all shadow-sm"
                      placeholder="e.g. Faisal Ahmed"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Your Rating</label>
                    <div className="flex gap-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                          className="focus:outline-none transition-transform hover:scale-125 active:scale-90"
                        >
                          <Star
                            className={cn(
                              "w-7 h-7",
                              star <= newReview.rating ? "fill-[#ffa534] text-[#ffa534]" : "text-gray-200"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Review Message</label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all shadow-sm min-h-[120px] resize-none"
                      placeholder="What did you like about this course?"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Proof (Optional)</label>
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="relative w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden group hover:border-[#D4AF37] transition-all shrink-0">
                        {reviewImagePreview ? (
                          <img src={reviewImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-6 h-6 text-gray-400 group-hover:text-[#D4AF37]" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReviewImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 leading-tight">Add a screenshot of your certificate or progress</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isSubmittingReview ? (
                      <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Post Review
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-8">
              {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10 text-gray-200" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h4>
                  <p className="text-gray-400 max-w-xs text-center">Be the first to share your learning journey with other students!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#0052CC] p-[2px]">
                            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-xl font-black text-[#0052CC]">
                              {review.user_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 text-lg">{review.user_name}</h4>
                            <div className="flex items-center gap-3">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      star <= review.rating ? "fill-[#ffa534] text-[#ffa534]" : "fill-gray-100 text-gray-100"
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-lg leading-relaxed italic">
                        "{review.comment}"
                      </p>

                      {review.image_url && (
                        <div className="mt-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm inline-block group">
                          <img 
                            src={review.image_url} 
                            alt="Review proof" 
                            className="max-h-64 w-auto object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      <Toaster position="top-center" />
      
      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-[#0CF2A0]" />
                  Your Cart
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-bold text-lg">Your cart is empty</p>
                    <p className="text-gray-400 text-sm mt-1">Looks like you haven't added anything yet.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 bg-[#D4AF37] text-black px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-start bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <img 
                          src={item.image || null} 
                          alt={item.title} 
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{item.title}</h4>
                          <p className="text-[#D4AF37] font-black text-lg">{item.price}</p>
                        </div>
                        <button 
                          onClick={() => {
                            cartService.removeFromCart(item.id);
                            toast.success('Removed from cart');
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-4">
                  {/* Coupon Section */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Enter coupon code" 
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          disabled={!!appliedCoupon}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </div>
                      {appliedCoupon ? (
                        <button 
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponCode('');
                            toast.info('Coupon removed');
                          }}
                          className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            const coupon = (settings.coupons || []).find(c => c.code === couponCode && c.isActive);
                            if (coupon) {
                              setAppliedCoupon(coupon);
                              toast.success(`Coupon applied: ${coupon.discount}% off!`);
                            } else {
                              toast.error('Invalid or inactive coupon code');
                            }
                          }}
                          className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                    {appliedCoupon && (
                      <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 p-2 rounded-lg">
                        <Check className="w-4 h-4" />
                        Coupon "{appliedCoupon.code}" applied successfully!
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="font-bold">
                        ${cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0).toFixed(2)}
                      </span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm font-medium">Discount ({appliedCoupon.discount}%)</span>
                        <span className="font-bold">
                          -${(cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0) * appliedCoupon.discount / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-black text-[#D4AF37]">
                        ${(
                          cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0) * 
                          (appliedCoupon ? (1 - appliedCoupon.discount / 100) : 1)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold shadow-lg shadow-[#D4AF37]/20 hover:shadow-xl hover:shadow-[#D4AF37]/30 transition-all flex items-center justify-center gap-2 text-lg mt-4"
                    onClick={() => {
                      const phoneNumber = "+8801314493061";
                      const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0);
                      const discount = appliedCoupon ? (subtotal * appliedCoupon.discount) / 100 : 0;
                      const total = subtotal - discount;
                      
                      let message = `*New Order from Course Hunt*\n\n`;
                      message += `*Items:*\n`;
                      cartItems.forEach((item, index) => {
                        message += `${index + 1}. ${item.title} - ${item.price}\n`;
                      });
                      
                      message += `\n*Subtotal:* $${subtotal.toFixed(2)}`;
                      if (appliedCoupon) {
                        message += `\n*Coupon:* ${appliedCoupon.code} (-${appliedCoupon.discount}%)`;
                        message += `\n*Discount:* -$${discount.toFixed(2)}`;
                      }
                      message += `\n*Total Price:* $${total.toFixed(2)}`;
                      
                      const encodedMessage = encodeURIComponent(message);
                      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
                    }}
                  >
                    Checkout via WhatsApp
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
