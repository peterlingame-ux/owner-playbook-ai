import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import flagUsa from "@/assets/flag-usa.png";
import flagChina from "@/assets/flag-china.png";
import flagKorea from "@/assets/flag-korea.png";
import flagSpain from "@/assets/flag-spain.png";
import flagFrance from "@/assets/flag-france.png";
import flagGermany from "@/assets/flag-germany.png";
import flagPortugal from "@/assets/flag-portugal.png";
import flagJapan from "@/assets/flag-japan.png";
import flagSaudi from "@/assets/flag-saudi.png";
import flagRussia from "@/assets/flag-russia.png";
import flagIndia from "@/assets/flag-india.png";
import flagItaly from "@/assets/flag-italy.png";
import flagThailand from "@/assets/flag-thailand.png";
import flagHongKong from "@/assets/flag-hong-kong.svg";

const languages = [
  { code: 'en', label: 'EN', flag: flagUsa, alt: 'USA Flag' },
  { code: 'zh', label: '简体', flag: flagChina, alt: 'China Flag' },
  { code: 'zh-HK', label: '繁體', flag: flagHongKong, alt: 'Hong Kong Flag' },
  { code: 'ko', label: '한국어', flag: flagKorea, alt: 'Korea Flag' },
  { code: 'es', label: 'ES', flag: flagSpain, alt: 'Spain Flag' },
  { code: 'fr', label: 'FR', flag: flagFrance, alt: 'France Flag' },
  { code: 'de', label: 'DE', flag: flagGermany, alt: 'Germany Flag' },
  { code: 'pt', label: 'PT', flag: flagPortugal, alt: 'Portugal Flag' },
  { code: 'ja', label: '日本語', flag: flagJapan, alt: 'Japan Flag' },
  { code: 'ar', label: 'العربية', flag: flagSaudi, alt: 'Arabic Flag' },
  { code: 'ru', label: 'RU', flag: flagRussia, alt: 'Russia Flag' },
  { code: 'hi', label: 'हिंदी', flag: flagIndia, alt: 'India Flag' },
  { code: 'it', label: 'IT', flag: flagItaly, alt: 'Italy Flag' },
  { code: 'th', label: 'ไทย', flag: flagThailand, alt: 'Thailand Flag' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // Load saved language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && languages.some(l => l.code === savedLang)) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 font-pixel text-xs"
        >
          <img 
            src={currentLang.flag} 
            alt={currentLang.alt}
            className="h-4 w-6 object-cover rounded-sm"
          />
          <span className="hidden sm:inline">{currentLang.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              currentLang.code === lang.code ? 'bg-accent' : ''
            }`}
          >
            <img 
              src={lang.flag} 
              alt={lang.alt}
              className="h-4 w-6 object-cover rounded-sm"
            />
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
