import type { Transition, Variants } from 'motion/react';

/**
 * Standard spring animation used across app
 */
export const SPRING_transitions: Transition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

/**
 * Standard fade animation variants
 */
export const FADE_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeInOut' as const,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut' as const,
    },
  },
};

/**
 * Stagger container animation
 */
export const STAGGER_CONTAINER: Variants = {
  hidden: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      ease: 'easeInOut' as const,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: 1,
      ease: 'easeInOut' as const,
    },
  },
};
