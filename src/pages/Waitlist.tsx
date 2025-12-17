import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trophy, ChevronRight, ChevronLeft, Gift, Clock, Calendar, 
  Star, Sparkles, Users, CheckCircle2
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
  iphone: { name: "iPhone 16 Pro", image: iphoneImg, color: "from-blue-500 to-purple-600", value: 8999 },
  watch: { name: "Apple Watch Ultra", image: watchImg, color: "from-amber-500 to-orange-600", value: 6499 },
  macbook: { name: "MacBook Pro 14\"", image: macbookImg, color: "from-gray-600 to-gray-800", value: 14999 },
  airpods: { name: "AirPods Pro 2", image: airpodsImg, color: "from-cyan-500 to-blue-500", value: 1899 },
  ps5: { name: "PlayStation 5", image: ps5Img, color: "from-indigo-600 to-blue-700", value: 4299 },
  camera: { name: "Sony A7C II", image: cameraImg, color: "from-rose-500 to-pink-600", value: 12999 },
  tv: { name: "三星 65\" OLED TV", image: tvImg, color: "from-green-500 to-emerald-600", value: 15999 },
  speaker: { name: "HomePod 2", image: speakerImg, color: "from-violet-500 to-purple-600", value: 2299 },
  ipad: { name: "iPad Pro 12.9\"", image: ipadImg, color: "from-slate-500 to-zinc-700", value: 9999 },
};

// Generate prize schedule for the month
const generatePrizeSchedule = (year: number, month: number) => {
  const prizeKeys = Object.keys(prizeTypes) as Array<keyof typeof prizeTypes>;
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });
  
  return days.map((date, index) => {
    // Rotate through prizes, with special prizes on weekends
    const dayOfWeek = getDay(date);
    let prizeKey: keyof typeof prizeTypes;
    
    if (dayOfWeek === 0) { // Sunday - big prizes
      prizeKey = ['macbook', 'tv', 'camera'][index % 3] as keyof typeof prizeTypes;
    } else if (dayOfWeek === 6) { // Saturday - medium prizes
      prizeKey = ['iphone', 'ipad', 'ps5'][index % 3] as keyof typeof prizeTypes;
    } else { // Weekdays
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

const Waitlist = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [prizeSchedule, setPrizeSchedule] = useState<ReturnType<typeof generatePrizeSchedule>>([]);
  
  // Countdown to today's draw (assume 21:00 draw time)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
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
        // Draw already happened today
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
  
  // Get first day offset
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startOffset = getDay(firstDayOfMonth);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
            <Gift className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">每日竞猜大奖</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            每天参与预测，赢取精美奖品
          </h1>
          <p className="text-muted-foreground">
            完成每日预测任务，即可参与当日奖品抽取
          </p>
        </motion.div>

        {/* Today's Prize Feature */}
        {todayPrize && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`relative overflow-hidden rounded-2xl p-6 mb-8 bg-gradient-to-br ${todayPrize.prize.color}`}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <Star className="w-4 h-4" />
                <span>今日奖品</span>
                <span className="ml-auto">{format(new Date(), "MM月dd日")}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {todayPrize.prize.name}
                  </h2>
                  <p className="text-white/80 text-lg mb-4">
                    价值 <span className="text-white font-bold">¥{todayPrize.prize.value.toLocaleString()}</span>
                  </p>
                  
                  {/* Countdown */}
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-white/80" />
                    <span className="text-white/80 text-sm">距离开奖</span>
                    <div className="flex items-center gap-1">
                      <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-white font-mono font-bold">
                        {String(countdown.hours).padStart(2, '0')}
                      </span>
                      <span className="text-white">:</span>
                      <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-white font-mono font-bold">
                        {String(countdown.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-white">:</span>
                      <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-white font-mono font-bold">
                        {String(countdown.seconds).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30">
                    <img 
                      src={todayPrize.prize.image} 
                      alt={todayPrize.prize.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate(user ? '/' : '/auth')}
                className="mt-4 bg-white text-gray-900 hover:bg-white/90"
              >
                {user ? '立即参与预测' : '免费注册参与'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* How to Participate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { step: 1, title: "完成预测", desc: "每日完成5场比赛预测" },
            { step: 2, title: "获取抽奖资格", desc: "预测准确率≥50%即可" },
            { step: 3, title: "等待开奖", desc: "每晚21:00自动开奖" },
          ].map((item) => (
            <div key={item.step} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <h3 className="font-medium text-foreground text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Prize Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-8"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              奖品日历
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-foreground min-w-[100px] text-center">
                {format(currentMonth, "yyyy年MM月", { locale: zhCN })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div 
                key={day} 
                className={`text-center text-xs font-medium py-2 ${
                  index === 0 || index === 6 ? 'text-amber-500' : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            
            {/* Days with prizes */}
            {prizeSchedule.map((dayData) => {
              const isSelected = selectedDay && isSameDay(dayData.date, selectedDay);
              const isPast = dayData.isDrawn;
              const isTodayDate = isToday(dayData.date);
              
              return (
                <motion.button
                  key={dayData.date.toISOString()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(dayData.date)}
                  className={`aspect-square rounded-lg p-0.5 transition-all relative overflow-hidden ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : isTodayDate
                        ? 'ring-2 ring-amber-500'
                        : isPast
                          ? 'opacity-60'
                          : 'hover:ring-1 hover:ring-border'
                  }`}
                >
                  {/* Product image background */}
                  <div className="absolute inset-0">
                    <img 
                      src={dayData.prize.image} 
                      alt={dayData.prize.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className={`absolute inset-0 rounded-lg ${
                      isPast ? 'bg-black/50' : 'bg-black/30'
                    }`} />
                  </div>
                  
                  {/* Day number and status */}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-0.5">
                    <span className={`text-xs sm:text-sm font-bold ${
                      isTodayDate ? 'text-amber-400' : 'text-white'
                    }`}>
                      {format(dayData.date, "d")}
                    </span>
                    {isPast && (
                      <span className="text-[8px] sm:text-[10px] font-medium text-white/90 bg-black/40 px-1 rounded">
                        已开奖
                      </span>
                    )}
                  </div>
                  
                  {/* Today indicator */}
                  {isTodayDate && (
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-white" />
                    </div>
                  )}
                  
                  {/* Won indicator */}
                  {isPast && dayData.winner && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-success rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-2 h-2 text-white" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded ring-2 ring-amber-500" />
              <span>今日</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-success" />
              <span>已开奖</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted" />
              <span>待开奖</span>
            </div>
          </div>
        </motion.div>

        {/* Selected Day Details */}
        <AnimatePresence mode="wait">
          {selectedDayPrize && (
            <motion.div
              key={selectedDay?.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img 
                    src={selectedDayPrize.prize.image} 
                    alt={selectedDayPrize.prize.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground mb-1">
                    {format(selectedDayPrize.date, "yyyy年MM月dd日", { locale: zhCN })}
                    {isToday(selectedDayPrize.date) && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs">今日</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{selectedDayPrize.prize.name}</h3>
                  <p className="text-muted-foreground">
                    价值 <span className="text-foreground font-semibold">¥{selectedDayPrize.prize.value.toLocaleString()}</span>
                  </p>
                  
                  {selectedDayPrize.isDrawn && selectedDayPrize.winner ? (
                    <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="flex items-center gap-3">
                        <img 
                          src={selectedDayPrize.winner.avatar} 
                          alt="" 
                          className="w-10 h-10 rounded-full border-2 border-success/30"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-success" />
                            <span className="font-medium text-foreground">{selectedDayPrize.winner.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            当日完成 {selectedDayPrize.winner.predictions} 场预测
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isToday(selectedDayPrize.date) ? (
                    <div className="mt-3 flex items-center gap-2 text-amber-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>今晚 21:00 开奖</span>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-muted-foreground">
                      等待开奖中...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Winners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
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
                  className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg"
                >
                  <img 
                    src={dayData.winner!.avatar} 
                    alt="" 
                    className="w-10 h-10 rounded-full border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{dayData.winner!.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(dayData.date, "MM/dd")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      获得 {dayData.prize.name}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                    <img 
                      src={dayData.prize.image} 
                      alt={dayData.prize.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Gift className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {prizeSchedule.filter(p => p.isDrawn).length}
            </div>
            <div className="text-xs text-muted-foreground">已送出奖品</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" fill="currentColor" />
            <div className="text-2xl font-bold text-foreground">
              {Math.floor(Math.random() * 5000) + 8000}
            </div>
            <div className="text-xs text-muted-foreground">参与用户</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Trophy className="w-6 h-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              ¥{((prizeSchedule.filter(p => p.isDrawn).reduce((sum, p) => sum + p.prize.value, 0)) / 10000).toFixed(1)}万
            </div>
            <div className="text-xs text-muted-foreground">累计奖品价值</div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center pb-8"
        >
          <Button 
            size="lg" 
            onClick={() => navigate(user ? '/' : '/auth')}
            className="px-8"
          >
            {user ? '立即参与今日预测' : '免费注册，立即参与'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
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
