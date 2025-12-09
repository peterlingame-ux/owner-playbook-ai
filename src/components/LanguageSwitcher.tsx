import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import flagUsa from "@/assets/flag-usa.png";
import flagChina from "@/assets/flag-china.png";
import flagKorea from "@/assets/flag-korea.png";

const languages = [
  { code: 'en', label: 'EN', flag: flagUsa, alt: 'USA Flag' },
  { code: 'zh', label: '中文', flag: flagChina, alt: 'China Flag' },
  { code: 'ko', label: '한국어', flag: flagKorea, alt: 'Korea Flag' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && ['en', 'zh', 'ko'].includes(savedLang)) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const toggleLanguage = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const currentIndex = languages.findIndex(l => l.code === i18n.language);
      const nextIndex = (currentIndex + 1) % languages.length;
      const newLang = languages[nextIndex].code;
      i18n.changeLanguage(newLang);
      localStorage.setItem('language', newLang);
      setIsAnimating(false);
    }, 150);
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 font-pixel text-xs overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLang.code}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          <motion.img 
            src={currentLang.flag} 
            alt={currentLang.alt}
            className="h-4 w-6 object-cover rounded-sm"
            animate={{ scale: isAnimating ? 0.8 : 1 }}
            transition={{ duration: 0.1 }}
          />
          <span>{currentLang.label}</span>
        </motion.div>
      </AnimatePresence>
    </Button>
  );
};

export default LanguageSwitcher;
