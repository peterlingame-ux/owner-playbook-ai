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

// Generate 30 prizes for the month
const prizes30 = Array.from({ length: 30 }, (_, i) => prizeImages[i % prizeImages.length]);

// Simple letter shapes - total cells = 30 across all letters
// H:4, U:3, N:3, S:3, O:4, C:3, C:3, E:4, R:3 = 30
const letterConfigs = [
  { letter: 'H', cells: [[0,0], [0,2], [1,1], [2,0], [2,2]] }, // 5 cells
  { letter: 'U', cells: [[0,0], [0,2], [1,0], [1,2], [2,1]] }, // 5 cells
  { letter: 'N', cells: [[0,0], [1,0], [1,1], [2,2]] }, // 4 cells
  { letter: 'S', cells: [[0,1], [0,2], [1,1], [2,0], [2,1]] }, // 5 cells
  { letter: 'O', cells: [[0,1], [1,0], [1,2], [2,1]] }, // 4 cells
  { letter: 'C', cells: [[0,1], [0,2], [1,0], [2,1], [2,2]] }, // 5 cells -> but we need less
  { letter: 'C', cells: [[0,1], [1,0], [2,1]] }, // 3 cells
  { letter: 'E', cells: [[0,0], [0,1], [1,0], [2,0], [2,1]] }, // 5 cells -> but we need less
  { letter: 'R', cells: [[0,0], [0,1], [1,0], [1,1], [2,0], [2,2]] }, // 6 cells -> but we need less
];

// Recalculate to get exactly 30 cells
// H:3, U:3, N:3, S:4, O:4, C:3, C:3, E:4, R:3 = 30
const letterShapes = [
  { letter: 'H', positions: [[0,0], [1,0], [1,1], [1,2], [2,0]] }, // simplified H - 5
  { letter: 'U', positions: [[0,0], [0,2], [2,1]] }, // simplified U - 3
  { letter: 'N', positions: [[0,0], [1,1], [2,2]] }, // simplified N - 3
  { letter: 'S', positions: [[0,1], [1,1], [2,1]] }, // simplified S - 3
  { letter: 'O', positions: [[0,1], [1,0], [1,2], [2,1]] }, // O - 4
  { letter: 'C', positions: [[0,1], [1,0], [2,1]] }, // C - 3
  { letter: 'C', positions: [[0,1], [1,0], [2,1]] }, // C - 3
  { letter: 'E', positions: [[0,0], [0,1], [1,0], [2,0], [2,1]] }, // E - 5
  { letter: 'R', positions: [[0,0], [1,0], [1,1]] }, // R - 3
]; // Total: 5+3+3+3+4+3+3+5+3 = 32, still not 30

// Final: exactly 30 cells distributed across HUNSOCCER
const finalLetterShapes = [
  { letter: 'H', grid: 3, positions: [[0,0], [0,2], [1,1], [2,0], [2,2]] }, // 5
  { letter: 'U', grid: 3, positions: [[0,0], [0,2], [2,1]] }, // 3  
  { letter: 'N', grid: 3, positions: [[0,0], [1,1], [2,0], [2,2]] }, // 4
  { letter: 'S', grid: 3, positions: [[0,1], [0,2], [1,1], [2,0], [2,1]] }, // 5
  { letter: 'O', grid: 3, positions: [[0,1], [1,0], [1,2], [2,1]] }, // 4
  { letter: 'C', grid: 3, positions: [[0,1], [1,0], [2,1]] }, // 3
  { letter: 'C', grid: 3, positions: [[0,1], [1,0], [2,1]] }, // 3
  { letter: 'E', grid: 3, positions: [[0,0], [1,0], [2,0]] }, // 3
  { letter: 'R', grid: 3, positions: [] }, // 0 - we'll skip this
]; // 5+3+4+5+4+3+3+3+0 = 30

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

  // Build all 30 prize cells with their positions
  const allCells: { letterIdx: number; row: number; col: number; prizeIdx: number }[] = [];
  let prizeCounter = 0;
  
  const letterData = [
    { letter: 'H', positions: [[0,0], [0,2], [1,0], [1,1], [1,2], [2,0], [2,2]] }, // 7
    { letter: 'U', positions: [[0,0], [0,2], [1,0], [1,2], [2,1]] }, // 5
    { letter: 'N', positions: [[0,0], [0,2], [1,1], [2,0], [2,2]] }, // 5
    { letter: 'S', positions: [[0,1], [0,2], [1,1], [2,0], [2,1]] }, // 5
    { letter: 'O', positions: [[0,1], [1,0], [1,2], [2,1]] }, // 4
    { letter: 'C', positions: [[0,1], [0,2], [1,0], [2,1], [2,2]] }, // 5 -> reduce to 4
    { letter: 'C', positions: [] }, // 0 - skip second C
    { letter: 'E', positions: [] }, // 0 - skip E
    { letter: 'R', positions: [] }, // 0 - skip R
  ];
  
  // Simplified approach: Create HUNSOCCER with exactly 30 cells total
  const letters30 = [
    { letter: 'H', cells: 4 },
    { letter: 'U', cells: 3 },
    { letter: 'N', cells: 3 },
    { letter: 'S', cells: 4 },
    { letter: 'O', cells: 3 },
    { letter: 'C', cells: 4 },
    { letter: 'C', cells: 3 },
    { letter: 'E', cells: 3 },
    { letter: 'R', cells: 3 },
  ]; // 4+3+3+4+3+4+3+3+3 = 30

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

        {/* HUNSOCCER with exactly 30 Prize Cells */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="flex justify-center items-end gap-3 sm:gap-4 md:gap-6">
            {(() => {
              let globalPrizeIdx = 0;
              return letters30.map((item, letterIdx) => (
                <div key={`${item.letter}-${letterIdx}`} className="flex flex-col items-center">
                  {/* Letter outline with prize images inside */}
                  <div 
                    className="relative flex flex-wrap justify-center items-center gap-1"
                    style={{ 
                      width: item.cells <= 3 ? '60px' : item.cells <= 4 ? '70px' : '80px',
                    }}
                  >
                    {Array.from({ length: item.cells }).map((_, cellIdx) => {
                      const currentPrizeIdx = globalPrizeIdx++;
                      return (
                        <div
                          key={cellIdx}
                          className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-md overflow-hidden border border-border/50 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <img 
                            src={prizes30[currentPrizeIdx % prizes30.length]}
                            alt={`Day ${currentPrizeIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* Letter label */}
                  <span className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black text-foreground/80">
                    {item.letter}
                  </span>
                </div>
              ));
            })()}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">30天 · 30份大奖</p>
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
