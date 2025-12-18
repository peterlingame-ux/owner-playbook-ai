import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, Trophy, Calendar, User, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
import dogeBannerImg from "@/assets/doge-banner.png";

// Prize data with names
const prizeData = [
  { name: "iPhone 15 Pro", image: iphoneImg },
  { name: "Apple Watch Ultra", image: watchImg },
  { name: "MacBook Pro 14", image: macbookImg },
  { name: "AirPods Pro", image: airpodsImg },
  { name: "PlayStation 5", image: ps5Img },
  { name: "Canon EOS R6", image: cameraImg },
  { name: "Samsung 65\" OLED TV", image: tvImg },
  { name: "Bose SoundLink", image: speakerImg },
  { name: "iPad Pro 12.9", image: ipadImg },
];

// Generate 30 days of prizes
const dayPrizes = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  ...prizeData[i % prizeData.length],
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
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [prizeWinners, setPrizeWinners] = useState<Record<number, PrizeWinner>>({});
  
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            每日竞猜赢取大奖
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            完成每日预测任务，即可参与当日奖品抽取，iPhone、MacBook、PS5 等你来拿
          </p>
          <img 
            src={dogeBannerImg} 
            alt="Daily Prize Banner" 
            className="w-full max-w-4xl mx-auto rounded-lg"
          />
        </motion.div>

        {/* Steps Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {[
            { step: "01", title: "完成每日预测", desc: "每日完成5场比赛预测，即可获得抽奖资格。预测越准确，中奖概率越高。" },
            { step: "02", title: "达成胜率要求", desc: "当日预测准确率需达到50%及以上，方可参与当晚21:00的奖品抽取。" },
            { step: "03", title: "领取专属奖品", desc: "中奖后系统将自动通知您，请在7日内完成奖品领取，逾期作废。" },
          ].map((item, idx) => (
            <div key={item.step} className="text-left">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-warning/90 text-warning-foreground font-bold text-sm">
                  {item.step}
                </span>
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {item.desc}
              </p>
              <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
                了解更多
              </Button>
            </div>
          ))}
        </motion.div>

        {/* Prize Calendar Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="relative">
            {/* Horizontal scrollable container */}
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
              <div className="inline-flex gap-2 min-w-max px-4">
                {/* 3 rows x 10 columns = 30 days */}
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((rowIdx) => (
                    <div key={rowIdx} className="flex gap-2">
                      {Array.from({ length: 10 }, (_, colIdx) => {
                        const dayIndex = rowIdx * 10 + colIdx;
                        const prize = dayPrizes[dayIndex];
                        const today = new Date().getDate();
                        const isToday = prize.day === today;
                        const isPast = prize.day < today;
                        const winner = prizeWinners[prize.day];
                        
                        return (
                          <div
                            key={colIdx}
                            onClick={() => setSelectedDay(prize.day)}
                            className={`
                              w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 
                              rounded-lg overflow-hidden relative group cursor-pointer
                              border-2 transition-all duration-300
                              ${isToday ? 'border-warning shadow-lg shadow-warning/30' : 'border-border/50'}
                              ${isPast ? 'opacity-60' : ''}
                            `}
                            title={`第${prize.day}天 - ${prize.name}`}
                          >
                            <img 
                              src={prize.image}
                              alt={prize.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Day number overlay */}
                            <div className={`
                              absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 
                              rounded-full flex items-center justify-center
                              text-[10px] sm:text-xs font-bold
                              ${isToday ? 'bg-warning text-warning-foreground' : 'bg-black/70 text-white'}
                            `}>
                              {prize.day}
                            </div>
                            {/* Winner indicator */}
                            {winner?.is_drawn && (
                              <div className="absolute top-1 left-1">
                                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-bold text-white text-center px-1">{prize.name}</span>
                            </div>
                            {/* Past day overlay */}
                            {isPast && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[10px] sm:text-xs font-medium text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
                                  {winner?.is_drawn ? '已开奖' : '已结束'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Scroll indicators */}
            <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
        </motion.div>

        {/* Countdown Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-muted-foreground mb-4">距离今日开奖</p>
          <div className="flex items-center justify-center gap-2 font-mono text-4xl sm:text-5xl font-bold text-foreground">
            <span className="bg-card border border-border px-4 py-3 rounded-lg min-w-[80px]">
              {String(countdown.hours).padStart(2, '0')}
            </span>
            <span className="text-muted-foreground">:</span>
            <span className="bg-card border border-border px-4 py-3 rounded-lg min-w-[80px]">
              {String(countdown.minutes).padStart(2, '0')}
            </span>
            <span className="text-muted-foreground">:</span>
            <span className="bg-card border border-border px-4 py-3 rounded-lg min-w-[80px]">
              {String(countdown.seconds).padStart(2, '0')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">每晚 21:00 准时开奖</p>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Button 
            onClick={() => navigate(user ? '/' : '/auth')}
            size="lg"
            className="px-8"
          >
            {user ? '立即参与预测' : '免费注册参与'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 pt-8 border-t border-border/50"
        >
          <div className="text-xs text-muted-foreground/70 text-center space-y-2 max-w-3xl mx-auto">
            <p className="font-medium text-muted-foreground">免责声明</p>
            <p>
              本活动为 HUNSOCCER 平台举办的虚拟预测竞猜活动，所有奖品抽取结果由系统随机生成，与任何形式的赌博或博彩活动无关。
              参与者需年满18周岁，活动最终解释权归 HUNSOCCER 所有。
            </p>
            <p>
              奖品发放需中奖者在7日内完成身份验证及收货地址确认，逾期视为自动放弃。
              因不可抗力因素导致奖品无法发放时，平台保留更换等值奖品的权利。
            </p>
            <p className="text-muted-foreground/50">
              © 2025 HUNSOCCER. All rights reserved.
            </p>
          </div>
        </motion.div>

      </main>

      {/* Prize Detail Dialog */}
      <Dialog open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-warning" />
              第 {selectedDay} 天奖品详情
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrize && (
            <div className="space-y-4">
              {/* Prize Image */}
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img 
                  src={selectedPrize.image} 
                  alt={selectedPrize.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Prize Name */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{selectedPrize.name}</h3>
                <p className="text-sm text-muted-foreground">当日奖品</p>
              </div>
              
              {/* Winner Info */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  中奖信息
                </h4>
                
                {selectedWinner?.is_drawn && selectedWinner.winner ? (
                  <div className="space-y-3">
                    {/* Winner Avatar & Name */}
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedWinner.winner.avatar_url}
                        alt={selectedWinner.winner.display_name}
                        className="w-10 h-10 rounded-full border-2 border-warning"
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedWinner.winner.display_name.slice(0, 1)}***{selectedWinner.winner.display_name.slice(-2)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          注册于 {format(new Date(selectedWinner.winner.created_at), 'yyyy-MM-dd')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Draw Time */}
                    {selectedWinner.drawn_at && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        开奖时间: {format(new Date(selectedWinner.drawn_at), 'yyyy-MM-dd HH:mm')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      {new Date().getDate() > (selectedDay || 0) ? '无人中奖' : '等待开奖'}
                    </p>
                    {new Date().getDate() === selectedDay && (
                      <p className="text-xs text-warning mt-1">今晚 21:00 开奖</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Waitlist;
