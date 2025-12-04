"use client"

import * as React from "react"
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

export interface ImageGenerationAnimationProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  onComplete?: () => void;
}

export const ImageGenerationAnimation = ({
  children,
  className,
  duration = 30000,
  onComplete,
}: ImageGenerationAnimationProps) => {
  const [progress, setProgress] = React.useState(0);
  const [loadingState, setLoadingState] = React.useState<
    "starting" | "generating" | "completed"
  >("starting");

  React.useEffect(() => {
    const startingTimeout = setTimeout(() => {
      setLoadingState("generating");

      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progressPercentage = Math.min(
          100,
          (elapsedTime / duration) * 100
        );

        setProgress(progressPercentage);

        if (progressPercentage >= 100) {
          clearInterval(interval);
          setLoadingState("completed");
          onComplete?.();
        }
      }, 16);

      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(startingTimeout);
  }, [duration, onComplete]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <motion.span
        className="bg-[linear-gradient(110deg,#888888,35%,#ffffff,50%,#888888,75%,#888888)] bg-[length:200%_100%] bg-clip-text text-transparent text-base font-medium"
        initial={{ backgroundPosition: "200% 0" }}
        animate={{
          backgroundPosition:
            loadingState === "completed" ? "0% 0" : "-200% 0",
        }}
        transition={{
          repeat: loadingState === "completed" ? 0 : Infinity,
          duration: 3,
          ease: "linear",
        }}
      >
        {loadingState === "starting" && "Getting started..."}
        {loadingState === "generating" && "Creating image. May take a moment."}
        {loadingState === "completed" && "Image created."}
      </motion.span>
      <div className="relative rounded-xl border border-[#30363d] bg-[#0d1117] max-w-md overflow-hidden">
        {children}
        <motion.div
          className="absolute w-full h-[125%] -top-[25%] pointer-events-none backdrop-blur-3xl"
          initial={false}
          animate={{
            clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
            opacity: loadingState === "completed" ? 0 : 1,
          }}
          style={{
            clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
            maskImage:
              progress === 0
                ? "linear-gradient(to bottom, black -5%, black 100%)"
                : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
            WebkitMaskImage:
              progress === 0
                ? "linear-gradient(to bottom, black -5%, black 100%)"
                : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
          }}
        />
      </div>
    </div>
  );
};

ImageGenerationAnimation.displayName = "ImageGenerationAnimation";

export default ImageGenerationAnimation;
