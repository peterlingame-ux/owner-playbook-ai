import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, Trophy, Calendar, User, Clock, Gift, Target, Award, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// Import product images
import appleWatchImg from "@/assets/prizes/apple-watch.png";
import appleAirpodsImg from "@/assets/prizes/apple-airpods.png";
import appleMacbookImg from "@/assets/prizes/apple-macbook.png";
import appleIpadImg from "@/assets/prizes/apple-ipad.png";
import appleVisionImg from "@/assets/prizes/apple-vision.png";
import appleIphoneImg from "@/assets/prizes/apple-iphone.png";
import dailyJackpotBg from "@/assets/daily-jackpot-bg.png";

// Prize data with names - 6 Apple products rotating
const prizeData = [
  { name: "iPhone 17", image: appleIphoneImg },
  { name: "Apple Watch Ultra", image: appleWatchImg },
  { name: "AirPods Pro", image: appleAirpodsImg },
  { name: "MacBook Pro", image: appleMacbookImg },
  { name: "iPad Pro", image: appleIpadImg },
  { name: "Apple Vision Pro", image: appleVisionImg },
];

// Mock winners data for demonstration
const mockWinners = [
  { display_name: "足球达人王", avatar_url: "/avatars/avatar-1.png", created_at: "2025-12-01" },
  { display_name: "Soccer李明", avatar_url: "/avatars/avatar-2.png", created_at: "2025-12-02" },
  { display_name: "预测高手张", avatar_url: "/avatars/avatar-3.png", created_at: "2025-12-03" },
  { display_name: "球迷小陈", avatar_url: "/avatars/avatar-4.png", created_at: "2025-12-04" },
  { display_name: "Winner刘洋", avatar_url: "/avatars/avatar-5.png", created_at: "2025-12-05" },
  { display_name: "足彩专家赵", avatar_url: "/avatars/avatar-6.png", created_at: "2025-12-06" },
  { display_name: "Lucky周杰", avatar_url: "/avatars/avatar-7.png", created_at: "2025-12-07" },
  { display_name: "神预测吴飞", avatar_url: "/avatars/avatar-8.png", created_at: "2025-12-08" },
  { display_name: "足球迷孙红", avatar_url: "/avatars/avatar-9.png", created_at: "2025-12-09" },
  { display_name: "BetKing郑伟", avatar_url: "/avatars/avatar-1.png", created_at: "2025-12-10" },
  { display_name: "预测达人黄", avatar_url: "/avatars/avatar-2.png", created_at: "2025-12-11" },
  { display_name: "TopPlayer林", avatar_url: "/avatars/avatar-3.png", created_at: "2025-12-12" },
  { display_name: "足彩王者许", avatar_url: "/avatars/avatar-4.png", created_at: "2025-12-13" },
  { display_name: "Champion何", avatar_url: "/avatars/avatar-5.png", created_at: "2025-12-14" },
  { display_name: "球迷达人谢", avatar_url: "/avatars/avatar-6.png", created_at: "2025-12-15" },
  { display_name: "Winner梁涛", avatar_url: "/avatars/avatar-7.png", created_at: "2025-12-16" },
  { display_name: "预测专家宋", avatar_url: "/avatars/avatar-8.png", created_at: "2025-12-17" },
  { display_name: "足球王者杨", avatar_url: "/avatars/avatar-9.png", created_at: "2025-12-18" },
  { display_name: "Lucky高飞", avatar_url: "/avatars/avatar-1.png", created_at: "2025-12-19" },
  { display_name: "BetMaster马", avatar_url: "/avatars/avatar-2.png", created_at: "2025-12-20" },
  { display_name: "神预测田野", avatar_url: "/avatars/avatar-3.png", created_at: "2025-12-21" },
  { display_name: "足彩高手罗", avatar_url: "/avatars/avatar-4.png", created_at: "2025-12-22" },
  { display_name: "Champion曹", avatar_url: "/avatars/avatar-5.png", created_at: "2025-12-23" },
  { display_name: "预测王者魏", avatar_url: "/avatars/avatar-6.png", created_at: "2025-12-24" },
  { display_name: "Winner严明", avatar_url: "/avatars/avatar-7.png", created_at: "2025-12-25" },
  { display_name: "足球达人钟", avatar_url: "/avatars/avatar-8.png", created_at: "2025-12-26" },
  { display_name: "TopBet韩飞", avatar_url: "/avatars/avatar-9.png", created_at: "2025-12-27" },
  { display_name: "Lucky唐明", avatar_url: "/avatars/avatar-1.png", created_at: "2025-12-28" },
  { display_name: "预测专家冯", avatar_url: "/avatars/avatar-2.png", created_at: "2025-12-29" },
  { display_name: "Champion蒋", avatar_url: "/avatars/avatar-3.png", created_at: "2025-12-30" },
];

// Generate 30 days of prizes with mock winners for past days
const today = new Date().getDate();
const dayPrizes = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  ...prizeData[i % prizeData.length],
  mockWinner: i + 1 < today ? mockWinners[i] : null,
}));

interface PrizeWinner {
  id: string;
  day_number: number;
  prize_name: string;
  is_drawn: boolean;
  drawn_at: string | null;
  winner: {
    display_name: string;
    avatar_url: string;
    created_at: string;
  } | null;
}

const Waitlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [prizeWinners, setPrizeWinners] = useState<Record<number, PrizeWinner>>({});
  
  const isZh = i18n.language === 'zh';
  
  // Fetch prize winners
  useEffect(() => {
    const fetchWinners = async () => {
      const now = new Date();
      const { data } = await supabase
        .from('daily_prize_winners')
        .select(`
          id,
          day_number,
          prize_name,
          is_drawn,
          drawn_at,
          winner:winner_id (
            display_name,
            avatar_url,
            created_at
          )
        `)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());
      
      if (data) {
        const winnersMap: Record<number, PrizeWinner> = {};
        data.forEach((item: any) => {
          winnersMap[item.day_number] = item;
        });
        setPrizeWinners(winnersMap);
      }
    };
    
    fetchWinners();
  }, []);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const drawTime = new Date();
      drawTime.setHours(21, 0, 0, 0);
      
      if (now > drawTime) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const diff = drawTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedPrize = selectedDay !== null ? dayPrizes[selectedDay - 1] : null;
  const selectedWinner = selectedDay !== null ? prizeWinners[selectedDay] : null;
  const currentMonth = new Date().getMonth() + 1;

  // Step icons
  const stepIcons = [Target, Award, Gift];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <img 
          src={dailyJackpotBg} 
          alt="" 
          className="w-full h-auto max-h-full object-contain opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>
      
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-6xl relative z-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/10 border border-warning/20 mb-4">
            <Sparkles className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-warning">{t('daily_prize_tag')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            {t('daily_prize_hero_title')}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('daily_prize_hero_desc')}
          </p>
        </motion.div>

        {/* Steps Section - Card Style */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16"
        >
          {[
            { step: "01", titleKey: "daily_step1_title", descKey: "daily_step1_desc" },
            { step: "02", titleKey: "daily_step2_title", descKey: "daily_step2_desc" },
            { step: "03", titleKey: "daily_step3_title", descKey: "daily_step3_desc" },
          ].map((item, idx) => {
            const Icon = stepIcons[idx];
            return (
              <motion.div 
                key={item.step}
                whileHover={{ y: -4 }}
                className="relative p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-warning/30 transition-all duration-300"
              >
                {/* Step Number Badge */}
                <div className="absolute -top-3 left-5 px-3 py-1 rounded-full bg-warning text-warning-foreground font-bold text-xs">
                  {item.step}
                </div>
                
                <div className="flex items-start gap-4 mt-2">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Prize Calendar Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12 sm:mb-16"
        >
          {/* Section Title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">{t('daily_prizes_section')}</h2>
              <p className="text-muted-foreground text-sm">{t('daily_draw_time_hint')}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-warning/60" />
                <span>{t('daily_today')}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-3">
                <div className="w-3 h-3 rounded-sm bg-muted opacity-60" />
                <span>{t('daily_past_days')}</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            {/* Horizontal scrollable container */}
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
              <div className="inline-flex gap-2 min-w-max px-2">
                {/* 3 rows x 10 columns = 30 days */}
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((rowIdx) => (
                    <div key={rowIdx} className="flex gap-2">
                      {Array.from({ length: 10 }, (_, colIdx) => {
                        const dayIndex = rowIdx * 10 + colIdx;
                        const prize = dayPrizes[dayIndex];
                        const now = new Date();
                        const todayDate = now.getDate();
                        const isToday = prize.day === todayDate;
                        const isPast = prize.day < todayDate;
                        const winner = prizeWinners[prize.day];
                        
                        return (
                          <motion.div
                            key={colIdx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedDay(prize.day)}
                            className={`
                              w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 
                              rounded-xl overflow-hidden relative group cursor-pointer
                              border-2 transition-all duration-300
                              ${isToday ? 'border-warning shadow-lg shadow-warning/30 ring-2 ring-warning/20' : 'border-border/30 hover:border-border'}
                              ${isPast ? 'opacity-50 grayscale' : ''}
                            `}
                          >
                            <img 
                              src={prize.image}
                              alt={prize.name}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Date overlay */}
                            <div className={`
                              absolute top-1 left-1 px-1.5 py-0.5 rounded
                              text-[9px] sm:text-[10px] font-bold
                              ${isToday ? 'bg-warning text-warning-foreground' : 'bg-black/70 text-white'}
                            `}>
                              {isZh ? `${currentMonth}月${prize.day}日` : `${currentMonth}/${prize.day}`}
                            </div>
                            
                            {/* Winner indicator */}
                            {isPast && (winner?.winner || prize.mockWinner) && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1 sm:p-1.5">
                                <div className="flex items-center gap-1">
                                  <img 
                                    src={winner?.winner?.avatar_url || prize.mockWinner?.avatar_url}
                                    alt=""
                                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-warning"
                                  />
                                  <span className="text-[8px] sm:text-[10px] font-medium text-white truncate">
                                    {(() => {
                                      const name = winner?.winner?.display_name || prize.mockWinner?.display_name || '';
                                      return name.slice(0, 1) + '**' + name.slice(-1);
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] sm:text-xs font-bold text-white text-center px-1">{prize.name}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Scroll indicators */}
            <div className="absolute left-0 top-0 bottom-4 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-4 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
        </motion.div>

        {/* Countdown Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-10 sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-warning" />
            <p className="text-muted-foreground font-medium">{t('countdown_to_draw')}</p>
          </div>
          
          <div className="flex items-center justify-center gap-2 sm:gap-3 font-mono text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            <div className="flex flex-col items-center">
              <span className="bg-card border border-border px-4 sm:px-6 py-3 sm:py-4 rounded-xl min-w-[70px] sm:min-w-[90px] shadow-sm">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-normal">{t('countdown_hours')}</span>
            </div>
            <span className="text-muted-foreground text-2xl sm:text-3xl mb-5">:</span>
            <div className="flex flex-col items-center">
              <span className="bg-card border border-border px-4 sm:px-6 py-3 sm:py-4 rounded-xl min-w-[70px] sm:min-w-[90px] shadow-sm">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-normal">{t('countdown_minutes')}</span>
            </div>
            <span className="text-muted-foreground text-2xl sm:text-3xl mb-5">:</span>
            <div className="flex flex-col items-center">
              <span className="bg-card border border-border px-4 sm:px-6 py-3 sm:py-4 rounded-xl min-w-[70px] sm:min-w-[90px] shadow-sm">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-normal">{t('countdown_seconds')}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground/70 mt-4">{t('daily_draw_at_21')}</p>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <motion.button
            onClick={() => navigate(user ? '/' : '/auth')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="
              px-10 sm:px-12 py-3.5 sm:py-4 text-base sm:text-lg font-bold rounded-xl
              bg-gradient-to-r from-warning via-amber-500 to-warning
              text-warning-foreground shadow-lg shadow-warning/25
              hover:shadow-xl hover:shadow-warning/35
              transition-all duration-300
              flex items-center gap-2 mx-auto
            "
          >
            {user ? t('start_prediction_btn') : t('join_now_btn')}
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          
          <p className="text-xs text-muted-foreground/70 mt-3">{t('no_deposit_free')}</p>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-14 sm:mt-16 pt-6 sm:pt-8 border-t border-border/30"
        >
          <div className="text-xs text-muted-foreground/60 text-center space-y-2 max-w-3xl mx-auto">
            <p className="font-medium text-muted-foreground/80">{t('disclaimer')}</p>
            <p className="leading-relaxed">{t('daily_disclaimer_text')}</p>
            <p className="text-muted-foreground/40 mt-4">© 2025 HUNSOCCER. All rights reserved.</p>
          </div>
        </motion.div>
      </main>

      {/* Prize Detail Dialog */}
      <Dialog open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-warning" />
              {t('day_prize_detail', { day: selectedDay })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrize && (
            <div className="space-y-4">
              {/* Prize Image */}
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img 
                  src={selectedPrize.image} 
                  alt={selectedPrize.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Prize Name */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{selectedPrize.name}</h3>
                <p className="text-sm text-muted-foreground">{t('daily_prize_label')}</p>
              </div>
              
              {/* Winner Info */}
              <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {t('winner_info')}
                </h4>
                
                {(() => {
                  const mockWinner = selectedPrize?.mockWinner;
                  const realWinner = selectedWinner?.winner;
                  const winner = realWinner || mockWinner;
                  const isPast = (selectedDay || 0) < new Date().getDate();
                  
                  if (winner && isPast) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={winner.avatar_url}
                            alt={winner.display_name}
                            className="w-10 h-10 rounded-full border-2 border-warning"
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {winner.display_name.slice(0, 1)}***{winner.display_name.slice(-2)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {t('registered_at')} {winner.created_at}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t('draw_time')}: {new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}-{String(selectedDay).padStart(2, '0')} 21:00
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">
                        {isPast ? t('no_winner') : t('waiting_draw')}
                      </p>
                      {new Date().getDate() === selectedDay && (
                        <p className="text-xs text-warning mt-1">{t('tonight_21_draw')}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default Waitlist;
