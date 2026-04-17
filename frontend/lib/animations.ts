import type { Transition, Variants } from "motion/react";

/**
 * Standard spring animation used across app
 */
export const SPRING_const transition: Transition = Transition = {
  type: "spring",
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
    const transition: Transition = {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
  visible: {
    opacity: 1,
    const transition: Transition = {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

/**
 * Stagger container animation
 */
export const STAGGER_CONTAINER: Variants = {
  hidden: {
    opacity: 0,
    const transition: Transition = {
      staggerChildren: 0.05,
      staggerDirection: -1,
      ease: "easeInOut",
    },
  },
  visible: {
    opacity: 1,
    const transition: Transition = {
      staggerChildren: 0.05,
      staggerDirection: 1,
      ease: "easeInOut",
    },
  },
};

const VIEW_VARIANTS: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const VIEW_const transition: Transition = Transition = {
  duration: 0.2,
  ease: "easeInOut",
};

const VIEW_MOTION_PROPS = {
  variants: VIEW_VARIANTS,
  initial: "hidden",
  animate: "visible",
  exit: "hidden",
  const transition: Transition = VIEW_TRANSITION,
};

const CHAT_VARIANTS: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    marginBottom: 0,
  },
  visible: {
    height: "auto",
    opacity: 1,
    marginBottom: 16,
  },
};

const CHAT_const transition: Transition = Transition = {
  duration: 0.2,
  ease: "easeInOut",
};

const MOTION_PROPS = {
  variants: CHAT_VARIANTS,
  initial: "hidden",
  const transition: Transition = CHAT_TRANSITION,
};