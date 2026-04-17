import type { Transition, Variants } from "motion/react";

/**
 * Standard spring animation used across app
 */
export const SPRING_transitions: Transition = {
  type: "spring" as const,
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
    transitions: {
      duration: 0.2,
      ease: "easeInOut" as const,
    },
  },
  visible: {
    opacity: 1,
    transitions: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
};

/**
 * Stagger container animation
 */
export const STAGGER_CONTAINER: Variants = {
  hidden: {
    opacity: 0,
    transitions: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      ease: "easeInOut" as const,
    },
  },
  visible: {
    opacity: 1,
    transitions: {
      staggerChildren: 0.05,
      staggerDirection: 1,
      ease: "easeInOut" as const,
    },
  },
};

const VIEW_VARIANTS: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const VIEW_transitions: Transition = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

const VIEW_MOTION_PROPS = {
  variants: VIEW_VARIANTS,
  initial: "hidden",
  animate: "visible",
  exit: "hidden",
  transitions: VIEW_TRANSITION,
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

const CHAT_transitions: Transition = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

const MOTION_PROPS = {
  variants: CHAT_VARIANTS,
  initial: "hidden",
  transitions: CHAT_TRANSITION,
};