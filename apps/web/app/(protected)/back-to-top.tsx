"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M12 19V5m-7 7 7-7 7 7" />
    </svg>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {show ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToTop}
            aria-label="Volver arriba"
            title="Volver arriba"
            className="fixed bottom-5 right-5 z-40 flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-opacity duration-150 hover:opacity-90"
          >
            <ArrowUpIcon />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
