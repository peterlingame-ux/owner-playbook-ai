import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import flagUsa from "@/assets/flag-usa.png";
import flagChina from "@/assets/flag-china.png";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // Load saved language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 font-pixel text-xs"
    >
      <img 
        src={i18n.language === 'en' ? flagUsa : flagChina} 
        alt={i18n.language === 'en' ? 'USA Flag' : 'China Flag'}
        className="h-4 w-6 object-cover rounded-sm"
      />
      {i18n.language === 'en' ? 'EN' : '中文'}
    </Button>
  );
};

export default LanguageSwitcher;
