import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";
import banner3 from "@/assets/banner-3.jpg";

const ads = [
  { id: 1, image: banner1, alt: "年末冲刺月" },
  { id: 2, image: banner2, alt: "逐梦欧战" },
  { id: 3, image: banner3, alt: "运筹帷幄" },
];

const AdCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-play carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-card/50 border border-border/50">
      {/* Carousel Container */}
      <div className="relative aspect-[21/9] sm:aspect-[3/1] lg:aspect-[4/1] overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0"
          >
            <img
              src={ads[currentIndex].image}
              alt={ads[currentIndex].alt}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay for better text readability if needed */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full bg-background/60 hover:bg-background/80 backdrop-blur-sm transition-all duration-200 border border-border/50"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full bg-background/60 hover:bg-background/80 backdrop-blur-sm transition-all duration-200 border border-border/50"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
        {ads.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "bg-primary w-4 sm:w-6"
                : "bg-foreground/30 hover:bg-foreground/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AdCarousel;