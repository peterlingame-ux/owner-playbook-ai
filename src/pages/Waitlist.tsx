import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trophy, ChevronRight, ChevronLeft, Gift, Clock, Calendar, 
  Smartphone, Watch, Laptop, Headphones, Gamepad2, Camera, 
  Tv, Speaker, Tablet, Star, Sparkles, Crown, Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, addMonths, subMonths, getDay } from "date-fns";
import { zhCN } from "date-fns/locale";

// Prize types with icons and colors
const prizeTypes = {
  iphone: { name: "iPhone 16 Pro", icon: Smartphone, color: "from-blue-500 to-purple-600", value: 8999 },
  watch: { name: "Apple Watch Ultra", icon: Watch, color: "from-amber-500 to-orange-600", value: 6499 },
  macbook: { name: "MacBook Pro 14\"", icon: Laptop, color: "from-gray-600 to-gray-800", value: 14999 },
  airpods: { name: "AirPods Pro 2", icon: Headphones, color: "from-cyan-500 to-blue-500", value: 1899 },
  ps5: { name: "PlayStation 5", icon: Gamepad2, color: "from-indigo-600 to-blue-700", value: 4299 },
  camera: { name: "Sony A7C II", icon: Camera, color: "from-rose-500 to-pink-600", value: 12999 },
  tv: { name: "三星 65\" OLED TV", icon: Tv, color: "from-green-500 to-emerald-600", value: 15999 },
  speaker: { name: "HomePod 2", icon: Speaker, color: "from-violet-500 to-purple-600", value: 2299 },
  ipad: { name: "iPad Pro 12.9\"", icon: Tablet, color: "from-slate-500 to-zinc-700", value: 9999 },
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
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <todayPrize.prize.icon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
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
              const Icon = dayData.prize.icon;
              const isSelected = selectedDay && isSameDay(dayData.date, selectedDay);
              const isPast = dayData.isDrawn;
              const isTodayDate = isToday(dayData.date);
              
              return (
                <motion.button
                  key={dayData.date.toISOString()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(dayData.date)}
                  className={`aspect-square rounded-lg p-1 transition-all relative ${
                    isSelected 
                      ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : isTodayDate
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500'
                        : isPast
                          ? 'bg-muted/50 opacity-60'
                          : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5">
                    {format(dayData.date, "d")}
                  </div>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto ${
                    isSelected ? 'text-primary-foreground' : isTodayDate ? 'text-amber-500' : 'text-muted-foreground'
                  }`} />
                  {isTodayDate && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-white" />
                    </div>
                  )}
                  {isPast && dayData.winner && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500" />
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
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedDayPrize.prize.color} flex items-center justify-center flex-shrink-0`}>
                  <selectedDayPrize.prize.icon className="w-8 h-8 text-white" />
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
                            <Crown className="w-4 h-4 text-success" />
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
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dayData.prize.color} flex items-center justify-center flex-shrink-0`}>
                    <dayData.prize.icon className="w-5 h-5 text-white" />
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
