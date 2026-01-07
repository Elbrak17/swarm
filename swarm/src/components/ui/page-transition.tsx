'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// ===========================================
// Animation Variants
// ===========================================

/**
 * Fade animation variants
 */
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Slide up animation variants
 */
export const slideUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Slide in from right animation variants
 */
export const slideRightVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * Scale animation variants
 */
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * Stagger children animation variants
 */
export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ===========================================
// Page Transition Component
// ===========================================

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page transition wrapper with fade animation
 * Wrap page content for smooth transitions between routes
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeVariants}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ===========================================
// Animated Container
// ===========================================

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'slideUp' | 'slideRight' | 'scale';
  delay?: number;
}

/**
 * Animated container with configurable animation
 */
export function AnimatedContainer({
  children,
  className,
  variant = 'fade',
  delay = 0,
}: AnimatedContainerProps) {
  const variants = {
    fade: fadeVariants,
    slideUp: slideUpVariants,
    slideRight: slideRightVariants,
    scale: scaleVariants,
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[variant]}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===========================================
// Stagger List
// ===========================================

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container that staggers children animations
 */
export function StaggerList({ children, className }: StaggerListProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Item within a StaggerList
 */
export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItemVariants}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===========================================
// Animated Card
// ===========================================

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
}

/**
 * Card with hover animation
 */
export function AnimatedCard({
  children,
  className,
  hoverScale = 1.02,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: hoverScale }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===========================================
// Collapse Animation
// ===========================================

interface CollapseProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Collapsible content with animation
 */
export function Collapse({ isOpen, children, className }: CollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={className}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===========================================
// Pulse Animation
// ===========================================

interface PulseProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
}

/**
 * Pulsing animation for attention-grabbing elements
 */
export function Pulse({ children, className, isActive = true }: PulseProps) {
  if (!isActive) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===========================================
// Number Counter Animation
// ===========================================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

/**
 * Animated number counter
 */
export function AnimatedNumber({
  value,
  duration = 1,
  className,
  formatter = (v) => v.toLocaleString(),
}: AnimatedNumberProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {formatter(value)}
      </motion.span>
    </motion.span>
  );
}

// ===========================================
// Presence Animation
// ===========================================

interface PresenceProps {
  children: ReactNode;
  isVisible: boolean;
  className?: string;
}

/**
 * Animate presence of an element
 */
export function Presence({ children, isVisible, className }: PresenceProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
