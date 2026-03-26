"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, Star, ShoppingCart, Plus, Check, Tag, Trash2 } from 'lucide-react';
import { SlideToUnlock } from './components/ui/reward-card';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { Link } from 'react-router-dom';
import { analyticsService } from './services/analyticsService';
import { cartService } from './services/cartService';
import { courseService } from './services/courseService';
import { Course } from './data/courses';
import { settingsService, AppSettings, Coupon } from './services/settingsService';
import { Toaster, toast } from 'sonner';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface Dot {
  x: number;
  y: number;
  baseColor: string;
  targetOpacity: number;
  currentOpacity: number;
  opacitySpeed: number;
  baseRadius: number;
  currentRadius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(() => {
    return !sessionStorage.getItem('welcome_popup_shown');
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [cartCount, setCartCount] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<AppSettings>(settingsService.getDefaultSettings());
  const [cartItems, setCartItems] = useState<Course[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { width, height } = useWindowSize();

  const dotsRef = useRef<Dot[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const gridRef = useRef<Record<string, number[]>>({});
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const mousePositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  const DOT_SPACING = 25;
  const BASE_OPACITY_MIN = 0.5;
  const BASE_OPACITY_MAX = 0.75;
  const BASE_RADIUS = 1.5;
  const INTERACTION_RADIUS = 150;
  const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
  const OPACITY_BOOST = 0.8;
  const RADIUS_BOOST = 3.5;
  const GRID_CELL_SIZE = Math.max(50, Math.floor(INTERACTION_RADIUS / 1.5));

  const handleMouseMove = (event: globalThis.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      mousePositionRef.current = { x: null, y: null };
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    mousePositionRef.current = { x: canvasX, y: canvasY };

    // Add to trail
    trailRef.current.push({ x: canvasX, y: canvasY, time: Date.now() });
  };

  const handleCanvasClick = (event: globalThis.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Create burst particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      const r = 240 - Math.random() * 52;
      const g = 148 - Math.random() * 124;
      const b = 51 + Math.random() * 137;
      
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, 1)`,
        size: Math.random() * 5 + 2
      });
    }
  };

  const createDots = () => {
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    const newDots: Dot[] = [];
    const newGrid: Record<string, number[]> = {};
    const cols = Math.ceil(width / DOT_SPACING);
    const rows = Math.ceil(height / DOT_SPACING);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * DOT_SPACING + DOT_SPACING / 2;
        const y = j * DOT_SPACING + DOT_SPACING / 2;
        const cellX = Math.floor(x / GRID_CELL_SIZE);
        const cellY = Math.floor(y / GRID_CELL_SIZE);
        const cellKey = `${cellX}_${cellY}`;

        if (!newGrid[cellKey]) {
          newGrid[cellKey] = [];
        }

        const dotIndex = newDots.length;
        newGrid[cellKey].push(dotIndex);

        const baseOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
        newDots.push({
          x,
          y,
          baseColor: `rgba(212, 175, 55, ${BASE_OPACITY_MAX})`,
          targetOpacity: baseOpacity,
          currentOpacity: baseOpacity,
          opacitySpeed: (Math.random() * 0.005) + 0.002,
          baseRadius: BASE_RADIUS,
          currentRadius: BASE_RADIUS,
        });
      }
    }
    dotsRef.current = newDots;
    gridRef.current = newGrid;
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;

    if (canvas.width !== width || canvas.height !== height ||
      canvasSizeRef.current.width !== width || canvasSizeRef.current.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvasSizeRef.current = { width, height };
      createDots();
    }
  };

  const animateDots = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const dots = dotsRef.current;
    const grid = gridRef.current;
    const { width, height } = canvasSizeRef.current;
    const { x: mouseX, y: mouseY } = mousePositionRef.current;

    if (!ctx || !dots || !grid || width === 0 || height === 0) {
      animationFrameId.current = requestAnimationFrame(animateDots);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const now = Date.now();

    // Draw Trail
    trailRef.current = trailRef.current.filter(p => now - p.time < 3000);
    trailRef.current.forEach(point => {
      const age = now - point.time;
      const opacity = 0.4 * (1 - age / 3000);
      const size = 4 * (1 - age / 3000);
      
      ctx.beginPath();
      ctx.fillStyle = `rgba(220, 39, 67, ${opacity})`;
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 0.005; 

      if (p.life > 0) {
        ctx.beginPath();
        const colorWithAlpha = p.color.replace('1)', `${p.life.toFixed(3)})`);
        ctx.fillStyle = colorWithAlpha;
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const activeDotIndices = new Set<number>();
    if (mouseX !== null && mouseY !== null) {
      const mouseCellX = Math.floor(mouseX / GRID_CELL_SIZE);
      const mouseCellY = Math.floor(mouseY / GRID_CELL_SIZE);
      const searchRadius = Math.ceil(INTERACTION_RADIUS / GRID_CELL_SIZE);
      for (let i = -searchRadius; i <= searchRadius; i++) {
        for (let j = -searchRadius; j <= searchRadius; j++) {
          const checkCellX = mouseCellX + i;
          const checkCellY = mouseCellY + j;
          const cellKey = `${checkCellX}_${checkCellY}`;
          if (grid[cellKey]) {
            grid[cellKey].forEach(dotIndex => activeDotIndices.add(dotIndex));
          }
        }
      }
    }

    dots.forEach((dot, index) => {
      dot.currentOpacity += dot.opacitySpeed;
      if (dot.currentOpacity >= dot.targetOpacity || dot.currentOpacity <= BASE_OPACITY_MIN) {
        dot.opacitySpeed = -dot.opacitySpeed;
        dot.currentOpacity = Math.max(BASE_OPACITY_MIN, Math.min(dot.currentOpacity, BASE_OPACITY_MAX));
        dot.targetOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
      }

      let interactionFactor = 0;
      dot.currentRadius = dot.baseRadius;

      if (mouseX !== null && mouseY !== null && activeDotIndices.has(index)) {
        const dx = dot.x - mouseX;
        const dy = dot.y - mouseY;
        const distSq = dx * dx + dy * dy;

        if (distSq < INTERACTION_RADIUS_SQ) {
          const distance = Math.sqrt(distSq);
          interactionFactor = Math.max(0, 1 - distance / INTERACTION_RADIUS);
          interactionFactor = interactionFactor * interactionFactor;
        }
      }

      const finalOpacity = Math.min(1, dot.currentOpacity + interactionFactor * OPACITY_BOOST);
      dot.currentRadius = dot.baseRadius + interactionFactor * RADIUS_BOOST;

      // Instagram-like gradient colors for dots
      const r = Math.floor(240 - (dot.x / canvas.width) * 52);
      const g = Math.floor(148 - (dot.y / canvas.height) * 124);
      const b = Math.floor(51 + (dot.x / canvas.width) * 137);

      ctx.beginPath();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity.toFixed(3)})`;
      ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    animationFrameId.current = requestAnimationFrame(animateDots);
  };

  useEffect(() => {
    handleResize();
    const handleMouseLeave = () => {
      mousePositionRef.current = { x: null, y: null };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleCanvasClick);
    window.addEventListener('resize', handleResize);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    animationFrameId.current = requestAnimationFrame(animateDots);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleCanvasClick);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const loadInitialData = async () => {
      const [fetchedCourses, fetchedSettings] = await Promise.all([
        courseService.getCourses(),
        settingsService.getSettings()
      ]);
      setCourses(fetchedCourses);
      setSettings(fetchedSettings);
      setCartCount(cartService.getCartCount());
      
      const items = cartService.getCartItems()
        .map(id => fetchedCourses.find(c => c.id === id))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };

    const handleCartUpdate = () => {
      setCartCount(cartService.getCartCount());
      setCourses(prevCourses => {
        const items = cartService.getCartItems()
          .map(id => prevCourses.find(c => c.id === id))
          .filter((c): c is Course => !!c);
        setCartItems(items);
        return prevCourses;
      });
    };
    
    const handleCoursesUpdate = async () => {
      const fetchedCourses = await courseService.getCourses();
      setCourses(fetchedCourses);
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
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const ITEMS_PER_PAGE = width < 768 ? 12 : 16;
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const currentCourses = filteredCourses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleUnlock = () => {
    setIsUnlocked(true);
    sessionStorage.setItem('welcome_popup_shown', 'true');
    // Automatically close the welcome popup after the congratulation animation
    setTimeout(() => {
      setShowWelcomePopup(false);
    }, 2500);
  };

  const UnlockedMessage = () => (
    <motion.div 
      className="mt-6 flex flex-col items-center justify-center space-y-2"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 15 }}
        className="flex h-16 w-16 items-center justify-center rounded-full instagram-gradient shadow-lg shadow-[#dc2743]/20"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>
      <div className="text-center">
        <p className="text-xl font-black shimmer-text">Access Granted!</p>
        <p className="text-sm text-gray-500 font-medium">Redirecting to Course Hunt...</p>
      </div>
    </motion.div>
  );

  const GiftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 12v8" />
      <path d="M19 12v8H5v-8" />
      <path d="M19 8a4 4 0 0 0-8 0" />
      <path d="M5 8a4 4 0 0 1 8 0" />
    </svg>
  );

  return (
    <>
      {/* Welcome Popup */}
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowWelcomePopup(false)}
          >
            {isUnlocked && (
              <Confetti 
                width={width} 
                height={height} 
                recycle={false} 
                numberOfPieces={800} 
                gravity={0.15}
                colors={['#f09433', '#dc2743', '#bc1888', '#ffffff']}
                tweenDuration={5000}
              />
            )}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <SlideToUnlock
                  onUnlock={handleUnlock}
                  unlockedContent={<UnlockedMessage />}
                  shimmer={true}
                  sliderText="Swipe to enter the website"
                >
                  <div className="text-center">
                    <motion.div 
                      className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full instagram-gradient shadow-lg text-white"
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <GiftIcon className="h-12 w-12 text-white" />
                    </motion.div>
                    <motion.h2 
                      className="text-2xl font-extrabold tracking-tight text-gray-900"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Welcome to Course Hunt!
                    </motion.h2>
                    <motion.p 
                      className="mt-3 text-sm text-gray-600 leading-relaxed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      Thank you for visiting! We're excited to have you here. Discover amazing courses and unlock your potential.
                    </motion.p>
                  </div>
                </SlideToUnlock>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-white text-gray-900 relative overflow-x-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-70" />
      <div className="absolute inset-0 z-1 pointer-events-none bg-white" />
      
      {/* Announcement Bar */}
      {settings.announcement && (
        <div className="relative z-40 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-2 px-4 text-center text-xs font-mono font-bold tracking-widest uppercase overflow-hidden">
          <motion.div
            animate={{ x: [0, -10, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            {settings.announcement}
          </motion.div>
        </div>
      )}

      <motion.header
        initial={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
        animate={{
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 255, 255, 0.8)",
          boxShadow: isScrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
          top: 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="sticky w-full z-30 backdrop-blur-md border-b border-gray-200"
      >
        <nav className="container mx-auto px-4 md:px-6 lg:px-8 flex justify-between items-center h-16">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div 
              className="w-8 h-8 instagram-gradient rounded-lg flex items-center justify-center"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <span className="text-black font-bold text-lg">C</span>
            </motion.div>
            <span className="text-xl font-bold text-gray-900">course-hunt</span>
          </motion.div>

          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/about" 
              className="text-gray-700 font-semibold hover:text-[#dc2743] transition-colors"
            >
              About
            </Link>
            <motion.div 
              className="relative cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 instagram-gradient text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {cartCount}
                </span>
              )}
            </motion.div>
          </div>

          <motion.button
            className="md:hidden text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 overflow-hidden"
            >
              <motion.div 
                className="container mx-auto px-4 py-4 flex flex-col space-y-4"
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: {
                    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
                  },
                  closed: {
                    transition: { staggerChildren: 0.05, staggerDirection: -1 }
                  }
                }}
              >
                <Link 
                  to="/about"
                  className="text-center text-lg font-bold text-gray-900 hover:text-[#dc2743]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </Link>
                <div 
                  className="flex items-center justify-center space-x-2 py-2 cursor-pointer"
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  <span className="text-gray-700 font-medium">Cart ({cartCount})</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="relative z-10 pt-12 md:pt-24 pb-16">
        <section className="container mx-auto px-4 md:px-6 lg:px-8 text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 bg-clip-text text-transparent"
          >
            Discover Your Next Course
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8"
          >
            Learn from top instructors and level up your skills
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="max-w-2xl mx-auto mb-8"
          >
            <motion.div 
              className="relative"
              whileFocus="focused"
            >
              <motion.div
                animate={{
                  x: [0, 2, -2, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </motion.div>
              <motion.input
                type="text"
                placeholder="Search for courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#dc2743] focus:border-[#dc2743] transition-all shadow-sm hover:shadow-md"
                whileFocus={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-3"
          >
            {["All", ...settings.categories].map((category, index) => (
              <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05, type: "spring", stiffness: 300 }}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm",
                  selectedCategory === category
                    ? "instagram-gradient text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-[#dc2743]"
                )}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {currentCourses.map((course, index) => (
              <Link 
                to={`/course/${course.id}`} 
                key={course.id}
                onClick={async () => {
                  await analyticsService.recordClick(course.id);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -5 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.08,
                    ease: "easeOut"
                  }}
                  className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#dc2743]/30 transition-all duration-300 cursor-pointer h-full flex flex-col group"
                >
                  <div className="relative h-32 md:h-48 overflow-hidden">
                    <img
                      src={course.image || null}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {course.additionalChoices === 'Popular' && (
                      <motion.div 
                        className="absolute top-2 right-2 md:top-3 md:right-3 bg-[#FFD700] text-[#0a0a0a] px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold shadow-md border border-[#DAA520]"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5 + index * 0.08, type: "spring", stiffness: 260, damping: 20 }}
                      >
                        Popular
                      </motion.div>
                    )}
                    {course.additionalChoices === 'New' && (
                      <motion.div 
                        className="absolute top-2 right-2 md:top-3 md:right-3 instagram-gradient text-white px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold shadow-md border border-white/20"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5 + index * 0.08, type: "spring", stiffness: 260, damping: 20 }}
                      >
                        New
                      </motion.div>
                    )}
                  </div>
                  <div className="p-3 md:p-5 flex-1 flex flex-col">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <div className="flex items-center mb-2 md:mb-3">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.6 + index * 0.08 + i * 0.05, type: "spring", stiffness: 200 }}
                          >
                            <Star
                              className={cn(
                                "w-3 h-3 md:w-4 md:h-4",
                                i < course.rating ? "fill-[#ffa534] text-[#ffa534]" : "fill-gray-300 text-gray-300"
                              )}
                            />
                          </motion.div>
                        ))}
                      </div>
                      <span className="text-[10px] md:text-sm text-gray-500 ml-1 md:ml-2">({course.reviews})</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-sm text-gray-400 line-through font-medium">{course.originalPrice}</span>
                        <motion.span 
                          className="text-lg md:text-2xl font-bold instagram-text"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.08 }}
                        >{course.price}</motion.span>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            cartService.addToCart(course.id);
                          }}
                          className={cn(
                            "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl transition-all shadow-sm",
                            cartService.isInCart(course.id) 
                              ? "bg-gray-100 text-gray-400 cursor-default" 
                              : "instagram-gradient text-white hover:shadow-md"
                          )}
                        >
                          {cartService.isInCart(course.id) ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-12">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-50 hover:bg-gray-200 transition-colors font-medium"
              >
                Previous
              </button>
              <span className="text-gray-600 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg instagram-gradient text-white disabled:opacity-50 hover:bg-opacity-90 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Why Choose course-hunt?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Expert Instructors",
                description: "Learn from industry professionals with years of experience",
                icon: "👨‍🏫"
              },
              {
                title: "Flexible Learning",
                description: "Study at your own pace, anytime and anywhere",
                icon: "⏰"
              },
              {
                title: "Lifetime Access",
                description: "Get unlimited access to all course materials forever",
                icon: "♾️"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-center shadow-md cursor-pointer"
              >
                <div className="text-6xl mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 mb-16">
          <motion.div 
            className="bg-white border-2 border-gray-100 rounded-3xl p-8 md:p-12 text-center shadow-xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Ready to Start Learning?
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {"Join thousands of students already learning on course-hunt"}
            </motion.p>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              whileHover={{ 
                scale: 1.08, 
                boxShadow: "0 20px 40px -10px rgba(212, 175, 55, 0.5)",
                y: -3
              }}
              whileTap={{ scale: 0.98 }}
              className="instagram-gradient text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-colors shadow-lg"
            >
              Get Started Free
            </motion.button>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t-2 border-gray-200 bg-white/90 backdrop-blur-md py-10">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <motion.p 
              className="text-gray-600 font-medium"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >© 2023 course-hunt. All rights reserved.</motion.p>
            <Link 
              to="/admin" 
              className="text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-[#dc2743]"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </footer>
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
                <ShoppingCart className="w-6 h-6 instagram-text" />
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
                    className="mt-6 instagram-gradient text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
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
                        <p className="instagram-text font-black text-lg">{item.price}</p>
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
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#dc2743] disabled:bg-gray-100 disabled:text-gray-500"
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
                    <span className="text-2xl font-black instagram-text">
                      ${(
                        cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0) * 
                        (appliedCoupon ? (1 - appliedCoupon.discount / 100) : 1)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button 
                  className="w-full instagram-gradient text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#dc2743]/20 hover:shadow-xl hover:shadow-[#dc2743]/30 transition-all flex items-center justify-center gap-2 text-lg mt-4"
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
    </>
  );
}
