import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight } from "lucide-react";

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

// Prize images array
const prizeImages = [
  iphoneImg, watchImg, macbookImg, airpodsImg, ps5Img, 
  cameraImg, tvImg, speakerImg, ipadImg
];

// Generate 30 days of prizes
const dayPrizes = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  image: prizeImages[i % prizeImages.length],
}));

// Letter pixel maps for HUNSOCCER (render only first 30 filled cells)
const letterMaps: Record<string, number[][]> = {
  H: [[1,0,1],[1,1,1],[1,0,1]],
  U: [[1,0,1],[1,0,1],[1,1,1]],
  N: [[1,0,1],[1,1,1],[1,0,1]],
  S: [[1,1,1],[0,1,0],[1,1,1]],
  O: [[1,1,1],[1,0,1],[1,1,1]],
  C: [[1,1,1],[1,0,0],[1,1,1]],
  E: [[1,1,1],[1,1,0],[1,1,1]],
  R: [[1,1,1],[1,1,0],[1,0,1]],
};
const MAX_CELLS = 30;

const Waitlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
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

  const letters = "HUNSOCCER".split("");

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="flex justify-center items-center gap-1 sm:gap-2 md:gap-3 overflow-x-auto">
            {(() => {
              let dayIndex = 0;
              return letters.map((letter, letterIdx) => {
                const map = letterMaps[letter];
                if (!map) return null;
                
                return (
                  <div key={`${letter}-${letterIdx}`} className="flex flex-col gap-0.5 sm:gap-1">
                    {map.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex gap-0.5 sm:gap-1">
                        {row.map((cell, cellIdx) => {
                          if (cell === 1) {
                            const currentDay = dayPrizes[dayIndex % 30];
                            dayIndex++;
                            return (
                              <div
                                key={cellIdx}
                                className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-[2px] overflow-hidden relative group cursor-pointer"
                                title={`第${currentDay.day}天`}
                              >
                                <img 
                                  src={currentDay.image}
                                  alt={`Day ${currentDay.day}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[8px] sm:text-xs font-bold text-white">{currentDay.day}</span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={cellIdx}
                              className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-transparent"
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
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

        {/* Prize List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-16 pt-12 border-t border-border"
        >
          <h2 className="text-xl font-semibold text-foreground text-center mb-8">奖品展示</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            {prizeImages.map((img, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-card border border-border">
                <img src={img} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Waitlist;
