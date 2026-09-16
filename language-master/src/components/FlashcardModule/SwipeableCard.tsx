// src/components/FlashcardModule/SwipeableCard.tsx
import { useRef} from 'react';
import type { ReactNode } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onFlip: () => void; // THÊM PROPS NÀY: Để báo cho FlipCard biết khi nào cần lật
  dragEnabled?: boolean; // THÊM PROPS NÀY: Cho phép tắt tính năng kéo nếu cần (ví dụ khi đang hiển thị đáp án)
}

export default function SwipeableCard({ children, onSwipeLeft, onSwipeRight, onFlip, dragEnabled = true}: SwipeableCardProps) {
const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const controls = useAnimation();

  // BIẾN LƯU VỊ TRÍ CHUỘT ĐỂ ĐO KHOẢNG CÁCH KÉO
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    if (!dragEnabled) return;
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      await controls.start({ x: 1000, transition: { duration: 0.3 } });
      onSwipeRight();
      controls.set({ x: 0 });
    } else if (info.offset.x < -swipeThreshold) {
      await controls.start({ x: -1000, transition: { duration: 0.3 } });
      onSwipeLeft();
      controls.set({ x: 0 });
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  return (
<motion.div
      className={`w-full ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} origin-bottom`}
      animate={controls}
      style={dragEnabled ? { x, rotate, opacity } : { }}
      drag={dragEnabled ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      
      // LOGIC TỰ ĐO KHOẢNG CÁCH:
      onPointerDown={(e) => {
        dragStartX.current = e.clientX;
        dragStartY.current = e.clientY;
      }}
      onPointerUp={(e) => {
        // Tính xem chuột đã di chuyển bao nhiêu pixel từ lúc bấm xuống
        const deltaX = Math.abs(e.clientX - dragStartX.current);
        const deltaY = Math.abs(e.clientY - dragStartY.current);
        
        // Nếu di chuyển dưới 5px (coi như tay bị rung nhẹ) -> Đây là CLICK, cho phép Lật
        if (deltaX < 5 && deltaY < 5) {
          onFlip();
        }
      }}
    >
      {children}
    </motion.div>
  );
}