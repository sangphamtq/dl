"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

const EASE_OUT: Transition = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1],
};

export function Rise({
  children,
  delay = 0,
  distance = 16,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ y: distance }}
      animate={{ y: 0 }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Curtain({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div
      className={cn("-mt-[0.8em] -mb-[0.25em]", className)}
      style={{ overflow: "hidden" }}
    >
      <motion.div
        className="pt-[0.8em] pb-[0.25em]"
        initial={{ y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ ...EASE_OUT, duration: 0.85, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function RiseInView({
  children,
  delay = 0,
  distance = 22,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ y: distance }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
