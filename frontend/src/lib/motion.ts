import type { Transition, Variants } from 'framer-motion';

/**
 * Shared motion vocabulary for the chat experience.
 *
 * The reference design uses smooth, settled entrances — content glides up and
 * fades in on an ease-out-expo curve (no spring bounce), and lists stagger their
 * children in sequence. Keep all entrance animations on these presets so the UI
 * feels like one cohesive, production-grade surface.
 */

// Ease-out-expo — fast start, soft settle. The signature "premium" curve.
export const easeOutExpo: Transition['ease'] = [0.16, 1, 0.3, 1];

// A single message / card sliding up into place.
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOutExpo },
  },
};

// Container that reveals its children one after another.
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

// Smaller element easing in (chips, badges, list rows).
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
};
