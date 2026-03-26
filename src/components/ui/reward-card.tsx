import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useDragControls } from 'framer-motion';

export const SlideToUnlock = ({
  onUnlock,
  unlockedContent,
  shimmer,
  sliderText,
  children
}: {
  onUnlock: () => void;
  unlockedContent: React.ReactNode;
  shimmer?: boolean;
  sliderText?: string;
  children: React.ReactNode;
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > containerWidth * 0.6) {
      setIsUnlocked(true);
      onUnlock();
    }
  };

  if (isUnlocked) {
    return <>{unlockedContent}</>;
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-auto overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0CF2A0] to-[#08a86f]"></div>
      {children}
      <div 
        ref={containerRef}
        className="mt-8 relative h-14 bg-gray-50 rounded-full overflow-hidden flex items-center justify-center shadow-inner border border-gray-100"
      >
        <span className="text-gray-400 font-medium text-sm z-0">{sliderText || "Slide to unlock"}</span>
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: containerWidth - 56 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="absolute left-1 top-1 bottom-1 w-12 bg-[#0CF2A0] rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center z-10 shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};
