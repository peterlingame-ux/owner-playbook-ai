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

// Prize images array (cycle through for 30 items)
const prizeImages = [
  iphoneImg, watchImg, macbookImg, airpodsImg, ps5Img, 
  cameraImg, tvImg, speakerImg, ipadImg
];

// Generate 30 prize slots
const generate30Prizes = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    image: prizeImages[i % prizeImages.length],
    day: i + 1,
  }));
};

// Letter pixel maps for HUNSOCCER (3x5 grid each, compact)
const letterMaps: Record<string, number[][]> = {
  H: [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  U: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  N: [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  S: [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  O: [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  C: [[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  E: [[1,1,1],[1,0,0],[1,1,1],[1,0,0],[1,1,1]],
  R: [[1,1,1],[1,0,1],[1,1,1],[1,1,0],[1,0,1]],
};

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
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            完成每日预测任务，即可参与当日奖品抽取，iPhone、MacBook、PS5 等你来拿
          </p>
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

        {/* HUNSOCCER with 30 Prize Grid - Single Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="flex justify-center items-center gap-1 sm:gap-2">
            {letters.map((letter, letterIdx) => {
              const map = letterMaps[letter];
              if (!map) return null;
              
              return (
                <div key={`${letter}-${letterIdx}`} className="flex flex-col gap-[2px]">
                  {map.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-[2px]">
                      {row.map((cell, cellIdx) => {
                        const prizeIdx = (letterIdx * 3 + rowIdx + cellIdx) % prizeImages.length;
                        return (
                          <div
                            key={cellIdx}
                            className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-[1px] overflow-hidden"
                          >
                            {cell === 1 ? (
                              <img 
                                src={prizeImages[prizeIdx]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-transparent" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          
          {/* 30 Prize Row Below */}
          <div className="mt-8">
            <p className="text-center text-sm text-muted-foreground mb-4">30天奖品预览</p>
            <div className="flex justify-center gap-1 flex-wrap max-w-4xl mx-auto">
              {generate30Prizes().map((prize) => (
                <div 
                  key={prize.id}
                  className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-md overflow-hidden border border-border bg-card hover:scale-110 transition-transform cursor-pointer group"
                >
                  <img src={prize.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white font-bold">{prize.day}</span>
                  </div>
                </div>
              ))}
            </div>
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
