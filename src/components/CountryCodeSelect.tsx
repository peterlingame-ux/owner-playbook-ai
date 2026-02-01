import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { countryCodes, getCountryName, type CountryCode } from "@/data/countryCodes";

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CountryCodeSelect = ({ value, onChange }: CountryCodeSelectProps) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentCountry = useMemo(() => {
    return countryCodes.find((c) => c.code === value) || countryCodes[0];
  }, [value]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryCodes;
    
    const query = searchQuery.toLowerCase();
    return countryCodes.filter((country) => {
      const name = getCountryName(country.country, i18n.language).toLowerCase();
      return (
        name.includes(query) ||
        country.code.includes(query) ||
        country.country.en.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, i18n.language]);

  const handleSelect = (country: CountryCode) => {
    onChange(country.code);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 sm:gap-1.5 !h-9 sm:!h-11 !px-2 sm:!px-3 !py-0 !min-w-0 !min-h-0 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/15 transition-colors min-w-[80px] sm:min-w-[110px] shrink-0 whitespace-nowrap touch-manipulation"
        >
          <span className="text-xs sm:text-sm font-medium shrink-0 whitespace-nowrap">
            {currentCountry.code === "+86" ? "CN" : currentCountry.flag}
          </span>
          <span className="text-xs sm:text-sm font-medium shrink-0 whitespace-nowrap">{currentCountry.code}</span>
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/60 ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-0 bg-slate-900 border-white/20 z-[100]" 
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder={i18n.language === "ko" ? "국가 검색..." : i18n.language === "zh-HK" ? "搜尋國家..." : i18n.language === "zh" ? "搜索国家..." : "Search country..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-white/5 border-white/10 text-white text-base placeholder:text-white/40"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            {filteredCountries.map((country, index) => (
              <button
                key={`${country.code}-${index}`}
                type="button"
                onClick={() => handleSelect(country)}
                className={`w-full flex items-center gap-2.5 !px-2.5 !py-2 !min-w-0 !min-h-0 rounded-md text-left transition-colors shrink-0 whitespace-nowrap touch-manipulation ${
                  country.code === value
                    ? "bg-teal-500/20 text-teal-400"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1 text-sm truncate">
                  {getCountryName(country.country, i18n.language)}
                </span>
                <span className="text-sm text-white/60 font-mono">{country.code}</span>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className="py-6 text-center text-white/50 text-sm">
                {i18n.language === "ko" ? "결과 없음" : i18n.language === "zh-HK" ? "無結果" : i18n.language === "zh" ? "无结果" : "No results"}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodeSelect;
