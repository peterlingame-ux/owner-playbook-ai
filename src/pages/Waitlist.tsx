import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ChevronRight, ChevronLeft, Clock, Calendar, Users, CheckCircle2
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

// Prize types with images
const prizeTypes = {
  iphone: { name: "iPhone 16 Pro", image: iphoneImg, value: 8999 },
  watch: { name: "Apple Watch Ultra", image: watchImg, value: 6499 },
  macbook: { name: "MacBook Pro 14\"", image: macbookImg, value: 14999 },
  airpods: { name: "AirPods Pro 2", image: airpodsImg, value: 1899 },
  ps5: { name: "PlayStation 5", image: ps5Img, value: 4299 },
  camera: { name: "Sony A7C II", image: cameraImg, value: 12999 },
  tv: { name: "三星 65\" OLED TV", image: tvImg, value: 15999 },
  speaker: { name: "HomePod 2", image: speakerImg, value: 2299 },
  ipad: { name: "iPad Pro 12.9\"", image: ipadImg, value: 9999 },
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

const Waitlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [prizeSchedule, setPrizeSchedule] = useState<ReturnType<typeof generatePrizeSchedule>>([]);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
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
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-muted border border-border mb-4">
            <span className="text-sm font-medium text-foreground">每日竞猜奖品</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            参与预测，赢取奖品
          </h1>
          <p className="text-muted-foreground">
            完成每日预测任务，即可参与当日奖品抽取
          </p>
        </motion.div>

        {/* Today's Prize */}
        {todayPrize && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-5 sm:p-6 mb-6"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span className="font-medium">今日奖品</span>
              <span>{format(new Date(), "MM月dd日 EEEE", { locale: zhCN })}</span>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={todayPrize.prize.image} 
                  alt={todayPrize.prize.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                  {todayPrize.prize.name}
                </h2>
                <p className="text-muted-foreground mb-4">
                  价值 <span className="text-foreground font-semibold">¥{todayPrize.prize.value.toLocaleString()}</span>
                </p>
                
                {/* Countdown */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">距离开奖</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="bg-muted px-2 py-1 rounded text-foreground font-semibold text-sm">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-muted-foreground">:</span>
                    <span className="bg-muted px-2 py-1 rounded text-foreground font-semibold text-sm">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-muted-foreground">:</span>
                    <span className="bg-muted px-2 py-1 rounded text-foreground font-semibold text-sm">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate(user ? '/' : '/auth')}
              className="w-full mt-5"
            >
              {user ? '立即参与预测' : '免费注册参与'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* How to Participate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { step: 1, title: "完成预测", desc: "每日完成5场比赛预测" },
            { step: 2, title: "获取资格", desc: "预测准确率≥50%即可" },
            { step: 3, title: "等待开奖", desc: "每晚21:00自动开奖" },
          ].map((item) => (
            <div 
              key={item.step}
              className="bg-card border border-border rounded-lg p-3 sm:p-4 text-center"
            >
              <div className="w-7 h-7 rounded-full bg-muted text-foreground font-semibold text-sm flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <h3 className="font-medium text-foreground text-sm mb-0.5">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Prize Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-6"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">奖品日历</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-foreground min-w-[100px] text-center text-sm">
                {format(currentMonth, "yyyy年MM月", { locale: zhCN })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded hover:bg-muted transition-colors"
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
                className={`text-center text-xs font-medium py-1.5 ${
                  index === 0 || index === 6 ? 'text-muted-foreground' : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            
            {prizeSchedule.map((dayData) => {
              const isSelected = selectedDay && isSameDay(dayData.date, selectedDay);
              const isPast = dayData.isDrawn;
              const isTodayDate = isToday(dayData.date);
              
              return (
                <button
                  key={dayData.date.toISOString()}
                  onClick={() => setSelectedDay(dayData.date)}
                  className={`aspect-square rounded-lg transition-all relative overflow-hidden ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' 
                      : isTodayDate
                        ? 'ring-2 ring-foreground'
                        : 'hover:ring-1 hover:ring-border'
                  }`}
                >
                  {/* Product image background */}
                  <div className="absolute inset-0">
                    <img 
                      src={dayData.prize.image} 
                      alt={dayData.prize.name}
                      className={`w-full h-full object-cover ${isPast ? 'grayscale opacity-50' : ''}`}
                    />
                    <div className={`absolute inset-0 ${
                      isPast ? 'bg-black/50' : 'bg-black/30'
                    }`} />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center">
                    {isPast ? (
                      <>
                        <span className="text-[10px] text-white/80 mb-0.5">
                          {format(dayData.date, "d")}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-medium text-white bg-black/40 px-1.5 py-0.5 rounded">
                          已开奖
                        </span>
                      </>
                    ) : (
                      <span className={`text-sm sm:text-base font-bold ${
                        isTodayDate ? 'text-white' : 'text-white'
                      }`}>
                        {format(dayData.date, "d")}
                      </span>
                    )}
                  </div>
                  
                  {/* Today indicator */}
                  {isTodayDate && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Day Details */}
        <AnimatePresence mode="wait">
          {selectedDayPrize && (
            <motion.div
              key={selectedDay?.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img 
                    src={selectedDayPrize.prize.image} 
                    alt={selectedDayPrize.prize.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(selectedDayPrize.date, "yyyy年MM月dd日", { locale: zhCN })}
                    {isToday(selectedDayPrize.date) && (
                      <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">今日</span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground">{selectedDayPrize.prize.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    价值 <span className="text-foreground font-medium">¥{selectedDayPrize.prize.value.toLocaleString()}</span>
                  </p>
                  
                  {selectedDayPrize.isDrawn && selectedDayPrize.winner ? (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <img 
                          src={selectedDayPrize.winner.avatar} 
                          alt="" 
                          className="w-10 h-10 rounded-full border border-border"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                            <span className="font-medium text-foreground text-sm">{selectedDayPrize.winner.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            当日完成 {selectedDayPrize.winner.predictions} 场预测
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isToday(selectedDayPrize.date) ? (
                    <div className="mt-3 flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      <span>今晚 21:00 开奖</span>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-muted-foreground">
                      等待开奖中
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Winners */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="text-base font-semibold text-foreground mb-3">近期获奖名单</h2>
          
          <div className="space-y-2">
            {prizeSchedule
              .filter(p => p.isDrawn && p.winner)
              .slice(-5)
              .reverse()
              .map((dayData) => (
                <div
                  key={dayData.date.toISOString()}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
                >
                  <img 
                    src={dayData.winner!.avatar} 
                    alt="" 
                    className="w-9 h-9 rounded-full border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{dayData.winner!.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(dayData.date, "MM/dd")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      获得 {dayData.prize.name}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={dayData.prize.image} 
                      alt={dayData.prize.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{drawnCount}</div>
            <div className="text-xs text-muted-foreground">已送出奖品</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{participantCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">参与用户</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-foreground">¥{(totalPrizeValue / 10000).toFixed(1)}万</div>
            <div className="text-xs text-muted-foreground">累计奖品价值</div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
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
