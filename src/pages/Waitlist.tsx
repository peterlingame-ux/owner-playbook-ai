import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trophy, ChevronRight, ChevronLeft, Gift, Clock, Calendar, 
  Star, Sparkles, Users, CheckCircle2, Crown, Zap, Target
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, addMonths, subMonths, getDay } from "date-fns";
import { zhCN } from "date-fns/locale";

// Import product images
import iphoneImg from "@/assets/prizes/iphone.jpg";
import watchImg from "@/assets/prizes/watch.jpg";
import macbookImg from "@/assets/prizes/macbook.jpg";
import airpodsImg from "@/assets/prizes/airpods.jpg";
import ps5Img from "@/assets/prizes/ps5.jpg";
import cameraImg from "@/assets/prizes/camera.jpg";
import tvImg from "@/assets/prizes/tv.jpg";
import speakerImg from "@/assets/prizes/speaker.jpg";
import ipadImg from "@/assets/prizes/ipad.jpg";

// Prize types with images and colors
const prizeTypes = {
  iphone: { name: "iPhone 16 Pro", image: iphoneImg, color: "from-blue-500 to-purple-600", value: 8999, tier: "premium" },
  watch: { name: "Apple Watch Ultra", image: watchImg, color: "from-amber-500 to-orange-600", value: 6499, tier: "premium" },
  macbook: { name: "MacBook Pro 14\"", image: macbookImg, color: "from-gray-600 to-gray-800", value: 14999, tier: "legendary" },
  airpods: { name: "AirPods Pro 2", image: airpodsImg, color: "from-cyan-500 to-blue-500", value: 1899, tier: "standard" },
  ps5: { name: "PlayStation 5", image: ps5Img, color: "from-indigo-600 to-blue-700", value: 4299, tier: "premium" },
  camera: { name: "Sony A7C II", image: cameraImg, color: "from-rose-500 to-pink-600", value: 12999, tier: "legendary" },
  tv: { name: "三星 65\" OLED TV", image: tvImg, color: "from-green-500 to-emerald-600", value: 15999, tier: "legendary" },
  speaker: { name: "HomePod 2", image: speakerImg, color: "from-violet-500 to-purple-600", value: 2299, tier: "standard" },
  ipad: { name: "iPad Pro 12.9\"", image: ipadImg, color: "from-slate-500 to-zinc-700", value: 9999, tier: "premium" },
};

// Generate prize schedule for the month
const generatePrizeSchedule = (year: number, month: number) => {
  const prizeKeys = Object.keys(prizeTypes) as Array<keyof typeof prizeTypes>;
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });
  
  return days.map((date, index) => {
    const dayOfWeek = getDay(date);
    let prizeKey: keyof typeof prizeTypes;
    
    if (dayOfWeek === 0) {
      prizeKey = ['macbook', 'tv', 'camera'][index % 3] as keyof typeof prizeTypes;
    } else if (dayOfWeek === 6) {
      prizeKey = ['iphone', 'ipad', 'ps5'][index % 3] as keyof typeof prizeTypes;
    } else {
      prizeKey = prizeKeys[index % prizeKeys.length];
    }
    
    return {
      date,
      prize: prizeTypes[prizeKey],
      prizeKey,
      isDrawn: isBefore(date, new Date()) && !isToday(date),
      winner: isBefore(date, new Date()) && !isToday(date) ? generateMockWinner() : null,
    };
  });
};

// Generate mock winner
const generateMockWinner = () => {
  const names = ["玩***8", "预***王", "足***3", "猜***手", "神***人", "冠***7", "赢***星", "胜***9"];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    avatar: `/avatars/avatar-${Math.floor(Math.random() * 9) + 1}.png`,
    predictions: Math.floor(Math.random() * 50) + 30,
  };
};

// Tier badge component
const TierBadge = ({ tier }: { tier: string }) => {
  const config = {
    legendary: { bg: "from-amber-500/30 to-yellow-500/30", border: "border-amber-500/50", text: "text-amber-400", label: "传说" },
    premium: { bg: "from-purple-500/30 to-indigo-500/30", border: "border-purple-500/50", text: "text-purple-400", label: "精品" },
    standard: { bg: "from-cyan-500/30 to-blue-500/30", border: "border-cyan-500/50", text: "text-cyan-400", label: "优质" },
  }[tier] || { bg: "from-gray-500/30 to-gray-600/30", border: "border-gray-500/50", text: "text-gray-400", label: "标准" };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${config.bg} ${config.border} border ${config.text} font-medium`}>
      {config.label}
    </span>
  );
};

const Waitlist = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [prizeSchedule, setPrizeSchedule] = useState<ReturnType<typeof generatePrizeSchedule>>([]);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // Stats with stable random values
  const participantCount = useMemo(() => Math.floor(Math.random() * 5000) + 8000, []);
  
  useEffect(() => {
    const schedule = generatePrizeSchedule(currentMonth.getFullYear(), currentMonth.getMonth());
    setPrizeSchedule(schedule);
  }, [currentMonth]);
  
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
  
  const todayPrize = prizeSchedule.find(p => isToday(p.date));
  const selectedDayPrize = selectedDay ? prizeSchedule.find(p => isSameDay(p.date, selectedDay)) : null;
  
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startOffset = getDay(firstDayOfMonth);
  
  const totalPrizeValue = prizeSchedule.filter(p => p.isDrawn).reduce((sum, p) => sum + p.prize.value, 0);
  const drawnCount = prizeSchedule.filter(p => p.isDrawn).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>
      
      <main className="container mx-auto px-4 py-6 max-w-5xl relative z-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 mb-5 backdrop-blur-sm"
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              每日竞猜大奖
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            参与预测，赢取<span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">精美奖品</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            完成每日预测任务，即可参与当日奖品抽取
          </p>
        </motion.div>

        {/* Today's Prize Feature - Premium Card */}
        {todayPrize && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl mb-10"
          >
            {/* Glass background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${todayPrize.prize.color} opacity-90`} />
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            
            {/* Animated background shapes */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-2xl"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-2xl"
              />
            </div>
            
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-center gap-2 text-white/90 text-sm mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">今日奖品</span>
                </div>
                <TierBadge tier={todayPrize.prize.tier} />
                <span className="ml-auto text-white/70">{format(new Date(), "MM月dd日 EEEE", { locale: zhCN })}</span>
              </div>
              
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                    {todayPrize.prize.name}
                  </h2>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-white/70 text-lg">价值</span>
                    <span className="text-3xl font-bold text-white drop-shadow-lg">
                      ¥{todayPrize.prize.value.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Premium Countdown */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                      <Clock className="w-4 h-4" />
                      <span>距离开奖</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[
                        { value: countdown.hours, label: "时" },
                        { value: countdown.minutes, label: "分" },
                        { value: countdown.seconds, label: "秒" },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
                              {String(item.value).padStart(2, '0')}
                            </span>
                            <span className="text-white/50 text-xs ml-1">{item.label}</span>
                          </div>
                          {index < 2 && <span className="text-white/50 text-2xl">:</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => navigate(user ? '/' : '/auth')}
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all font-semibold"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {user ? '立即参与预测' : '免费注册参与'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                <div className="flex-shrink-0 hidden sm:block">
                  <motion.div 
                    initial={{ y: 10 }}
                    animate={{ y: -10 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl scale-110" />
                    <div className="relative w-40 h-40 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 ring-4 ring-white/10">
                      <img 
                        src={todayPrize.prize.image} 
                        alt={todayPrize.prize.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* How to Participate - Premium Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 sm:gap-5 mb-10"
        >
          {[
            { step: 1, icon: Target, title: "完成预测", desc: "每日完成5场比赛预测", color: "from-cyan-500 to-blue-500" },
            { step: 2, icon: CheckCircle2, title: "获取资格", desc: "预测准确率≥50%即可", color: "from-green-500 to-emerald-500" },
            { step: 3, icon: Gift, title: "等待开奖", desc: "每晚21:00自动开奖", color: "from-amber-500 to-orange-500" },
          ].map((item, index) => (
            <motion.div 
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 text-center group hover:border-primary/30 transition-all overflow-hidden"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${item.color}`} />
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">步骤 {item.step}</div>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Prize Calendar - Premium Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-6 mb-10"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              奖品日历
            </h2>
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-background transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-foreground min-w-[120px] text-center">
                {format(currentMonth, "yyyy年MM月", { locale: zhCN })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-background transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {weekDays.map((day, index) => (
              <div 
                key={day} 
                className={`text-center text-sm font-semibold py-2 rounded-lg ${
                  index === 0 || index === 6 
                    ? 'text-amber-500 bg-amber-500/10' 
                    : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startOffset }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            
            {prizeSchedule.map((dayData) => {
              const isSelected = selectedDay && isSameDay(dayData.date, selectedDay);
              const isPast = dayData.isDrawn;
              const isTodayDate = isToday(dayData.date);
              
              return (
                <motion.button
                  key={dayData.date.toISOString()}
                  whileHover={{ scale: 1.08, zIndex: 10 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(dayData.date)}
                  className={`aspect-square rounded-xl transition-all relative overflow-hidden group ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg' 
                      : isTodayDate
                        ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/20'
                        : isPast
                          ? ''
                          : 'hover:ring-1 hover:ring-border hover:shadow-md'
                  }`}
                >
                  {/* Product image background */}
                  <div className="absolute inset-0">
                    <img 
                      src={dayData.prize.image} 
                      alt={dayData.prize.name}
                      className={`w-full h-full object-cover transition-all ${
                        isPast ? 'grayscale' : 'group-hover:scale-110'
                      }`}
                    />
                    <div className={`absolute inset-0 ${
                      isPast 
                        ? 'bg-black/60' 
                        : isTodayDate 
                          ? 'bg-gradient-to-t from-amber-900/70 via-black/30 to-transparent'
                          : 'bg-gradient-to-t from-black/60 via-black/30 to-transparent group-hover:from-black/40'
                    }`} />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-1">
                    {isPast ? (
                      <>
                        <span className="text-[10px] text-white/70 mb-0.5">
                          {format(dayData.date, "d")}日
                        </span>
                        <div className="bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
                          <span className="text-[10px] sm:text-xs font-bold text-white/90">
                            已开奖
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={`text-lg sm:text-xl font-bold drop-shadow-lg ${
                          isTodayDate ? 'text-amber-400' : 'text-white'
                        }`}>
                          {format(dayData.date, "d")}
                        </span>
                        <span className="text-[8px] text-white/70 font-medium">
                          ¥{(dayData.prize.value / 1000).toFixed(1)}k
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Today pulse indicator */}
                  {isTodayDate && (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl ring-2 ring-amber-500"
                      />
                      <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      </div>
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded ring-2 ring-amber-500 bg-amber-500/20" />
              <span>今日</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted grayscale" />
              <span>已开奖</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-purple-500" />
              <span>待开奖</span>
            </div>
          </div>
        </motion.div>

        {/* Selected Day Details - Premium */}
        <AnimatePresence mode="wait">
          {selectedDayPrize && (
            <motion.div
              key={selectedDay?.toISOString()}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-6 mb-10 overflow-hidden relative"
            >
              <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${selectedDayPrize.prize.color}`} />
              
              <div className="relative flex items-start gap-5">
                <div className="relative flex-shrink-0">
                  <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50 bg-gradient-to-br ${selectedDayPrize.prize.color}`} />
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl border border-white/10">
                    <img 
                      src={selectedDayPrize.prize.image} 
                      alt={selectedDayPrize.prize.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    {format(selectedDayPrize.date, "yyyy年MM月dd日 EEEE", { locale: zhCN })}
                    {isToday(selectedDayPrize.date) && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">今日</span>
                    )}
                    <TierBadge tier={selectedDayPrize.prize.tier} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-1">{selectedDayPrize.prize.name}</h3>
                  <p className="text-muted-foreground mb-4">
                    价值 <span className="text-foreground font-bold text-lg">¥{selectedDayPrize.prize.value.toLocaleString()}</span>
                  </p>
                  
                  {selectedDayPrize.isDrawn && selectedDayPrize.winner ? (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-success/30 rounded-full blur-md" />
                          <img 
                            src={selectedDayPrize.winner.avatar} 
                            alt="" 
                            className="relative w-12 h-12 rounded-full border-2 border-success/50"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-success" />
                            <span className="font-semibold text-foreground">{selectedDayPrize.winner.name}</span>
                            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">中奖</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            当日完成 <span className="text-foreground font-medium">{selectedDayPrize.winner.predictions}</span> 场预测
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isToday(selectedDayPrize.date) ? (
                    <div className="flex items-center gap-3 text-amber-500">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold">今晚 21:00 开奖</div>
                        <div className="text-xs text-amber-500/70">完成预测即可参与</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      等待开奖中...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Winners - Premium Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            近期获奖名单
          </h2>
          
          <div className="space-y-3">
            {prizeSchedule
              .filter(p => p.isDrawn && p.winner)
              .slice(-5)
              .reverse()
              .map((dayData, index) => (
                <motion.div
                  key={dayData.date.toISOString()}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-sm border border-border rounded-xl hover:border-primary/30 transition-all group"
                >
                  <div className="relative">
                    <img 
                      src={dayData.winner!.avatar} 
                      alt="" 
                      className="w-12 h-12 rounded-full border-2 border-border group-hover:border-primary/30 transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center border-2 border-background">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-foreground">{dayData.winner!.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {format(dayData.date, "MM/dd")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      获得 <span className="text-foreground">{dayData.prize.name}</span>
                    </p>
                  </div>
                  
                  <div className="relative flex-shrink-0">
                    <div className={`absolute inset-0 rounded-xl blur-md opacity-30 bg-gradient-to-br ${dayData.prize.color}`} />
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-white/10">
                      <img 
                        src={dayData.prize.image} 
                        alt={dayData.prize.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>

        {/* Stats - Premium Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3 sm:gap-5 mb-10"
        >
          {[
            { icon: Gift, value: drawnCount, label: "已送出奖品", color: "from-amber-500 to-orange-500" },
            { icon: Users, value: participantCount.toLocaleString(), label: "参与用户", color: "from-cyan-500 to-blue-500" },
            { icon: Trophy, value: `¥${(totalPrizeValue / 10000).toFixed(1)}万`, label: "累计奖品价值", color: "from-green-500 to-emerald-500" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 text-center group overflow-hidden"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${stat.color}`} />
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" fill={stat.icon === Users ? "currentColor" : "none"} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA - Premium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center pb-10"
        >
          <Button 
            size="lg" 
            onClick={() => navigate(user ? '/' : '/auth')}
            className="px-10 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-2xl transition-all"
          >
            <Zap className="w-5 h-5 mr-2" />
            {user ? '立即参与今日预测' : '免费注册，立即参与'}
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            无需充值，完成预测即可参与抽奖
          </p>
        </motion.div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground text-center pb-8 border-t border-border pt-6">
          <p>
            HUNSOCCER 每日竞猜活动仅为平台用户福利活动，所有奖品均为实物奖品。
            本活动最终解释权归 HUNSOCCER 所有。
          </p>
        </div>
      </main>
    </div>
  );
};

export default Waitlist;
