import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Elegant timing: 3.2 seconds total, then trigger onComplete
    const timer = setTimeout(() => {
      setIsFinished(true);
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  // Handle skip action
  const handleSkip = () => {
    setIsFinished(true);
  };

  // We wait for the exit animation to finish before calling onComplete
  const handleExitComplete = () => {
    onComplete();
  };

  // Letters of Clutch for staggered reveal
  const letters = ["C", "l", "u", "t", "c", "h"];

  // Animation variants
  const containerVariants = {
    exit: {
      opacity: 0,
      scale: 1.05,
      filter: "blur(10px)",
      transition: {
        duration: 0.6,
        ease: [0.43, 0.13, 0.23, 0.96]
      }
    }
  };

  const circleVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1.6, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.4 }
      }
    }
  };

  const checkmarkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
        opacity: { delay: 1.1, duration: 0.2 }
      }
    }
  };

  const fillVariants = {
    hidden: { fillOpacity: 0 },
    visible: {
      fillOpacity: 1,
      transition: {
        delay: 1.8,
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  };

  const letterContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 1.5
      }
    }
  };

  const letterVariants = {
    hidden: { y: 25, opacity: 0, filter: "blur(4px)" },
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100
      }
    }
  };

  const taglineVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 2.2,
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!isFinished && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[9999] bg-[#09090d] text-[#ebebea] flex flex-col items-center justify-center overflow-hidden font-sans select-none"
        >
          {/* Subtle cosmic starry ambient backgrounds */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-indigo-950/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-[25%] right-[20%] w-[350px] h-[350px] bg-emerald-950/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          </div>

          <div className="flex flex-col items-center relative z-10">
            {/* SVG Logo Animating */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              {/* Radial glow effect behind the logo */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1.1, opacity: [0.2, 0.4, 0.3] }}
                transition={{ delay: 1.4, duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                className="absolute w-28 h-28 bg-[#20b5be]/10 rounded-full blur-2xl"
              />

              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Crescent Ring/Circle path */}
                <motion.path
                  d="M 80,35 A 38,38 0 1,1 65,18 A 33,33 0 1,0 80,35 Z"
                  variants={circleVariants}
                  initial="hidden"
                  animate="visible"
                  stroke="#20b5be"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  // Use fill animation after stroke is completed
                  fill="#20b5be"
                  variants-fill={fillVariants}
                  animate-fill="visible"
                  style={{ originX: "50px", originY: "50px" }}
                />

                {/* Animated filled color fade in */}
                <motion.path
                  d="M 80,35 A 38,38 0 1,1 65,18 A 33,33 0 1,0 80,35 Z"
                  variants={fillVariants}
                  initial="hidden"
                  animate="visible"
                  fill="#20b5be"
                  style={{ mixBlendMode: "screen" }}
                />

                {/* Tick Checkmark path */}
                <motion.path
                  d="M 38,52 L 49,63 L 66,42"
                  variants={checkmarkVariants}
                  initial="hidden"
                  animate="visible"
                  stroke="#20b5be"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            {/* App Name "Clutch" Staggered Typography Reveal */}
            <motion.div
              variants={letterContainerVariants}
              initial="hidden"
              animate="visible"
              className="mt-6 flex items-center justify-center"
            >
              {letters.map((letter, idx) => (
                <motion.span
                  key={idx}
                  variants={letterVariants}
                  className="text-4xl md:text-5xl font-black tracking-tight text-white font-sans"
                  style={{
                    textShadow: "0 4px 20px rgba(32, 181, 190, 0.15)",
                    marginRight: letter === "h" ? "0" : "2px"
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>

            {/* High fidelity tagline */}
            <motion.p
              variants={taglineVariants}
              initial="hidden"
              animate="visible"
              className="mt-3 text-xs md:text-sm font-bold tracking-[0.25em] text-[#91918e] dark:text-[#7c7b77] uppercase text-center"
            >
              Cognitive Workspace
            </motion.p>
          </div>

          {/* Quick Skip button at bottom */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            whileHover={{ opacity: 0.8, scale: 1.02 }}
            transition={{ delay: 2.2, duration: 0.5 }}
            onClick={handleSkip}
            className="absolute bottom-8 px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold tracking-wider hover:bg-white/5 transition-all cursor-pointer"
          >
            Skip Animation
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
