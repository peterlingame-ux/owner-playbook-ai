import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, PlayCircle, Edit2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import footballFieldBg from "@/assets/football-field-bg.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

interface PlayerStarCardProps {
  displayName: string;
  avatarUrl: string;
  winRate: number;
  totalPredictions: number;
  correctPredictions: number;
  profit: number;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  editDisplayName: string;
  setEditDisplayName: (name: string) => void;
  selectedAvatar: string;
  setSelectedAvatar: (avatar: string) => void;
  avatarOptions: string[];
  onSaveProfile: () => void;
  isSaving: boolean;
  onNavigateToMatches?: () => void;
}

const PlayerStarCard = ({
  displayName,
  avatarUrl,
  winRate,
  totalPredictions,
  correctPredictions,
  profit,
  isEditDialogOpen,
  setIsEditDialogOpen,
  editDisplayName,
  setEditDisplayName,
  selectedAvatar,
  setSelectedAvatar,
  avatarOptions,
  onSaveProfile,
  isSaving,
  onNavigateToMatches,
}: PlayerStarCardProps) => {
  const { t } = useTranslation();
  
  // Animated win rate
  const animatedWinRate = useCountAnimation(winRate, { 
    duration: 1500,
    startValue: Math.max(0, winRate - 15)
  });
  
  // Player card color theme - primary green/gold
  const colorTint = { hue: '142deg', color: 'hsl(142 76% 36%)' };
  const withOpacity = (color: string, opacity: number) =>
    color.includes("/") ? color : color.replace(")", ` / ${opacity})`);
  const buttonGradientStart = withOpacity(colorTint.color, 0.18);
  const buttonGradientEnd = withOpacity(colorTint.color, 0.08);
  const buttonBorderColor = withOpacity(colorTint.color, 0.3);

  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border hover:border-opacity-50 transition-all group overflow-hidden"
      style={{
        borderColor: `hsl(142 76% 36% / 0.3)`,
        borderWidth: '2px'
      }}
    >
      {/* Star Player Background */}
      <div 
        className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${starHunsoccer})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Player Brand Color Overlay - Gold/Green */}
      <div 
        className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${colorTint.color}, transparent 70%)`
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            {/* Avatar with Edit Button */}
            <div className="relative">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center p-0.5 bg-card shrink-0 overflow-hidden"
                style={{
                  border: `2px solid hsl(142 76% 36%)`
                }}
              >
                <Avatar className="w-full h-full">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-warning text-white font-black">
                    {displayName?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Edit Button */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="icon" 
                    className="absolute -bottom-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary shadow-lg hover:scale-110 transition-transform z-20"
                  >
                    <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>编辑个人资料</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="display-name">昵称</Label>
                      <Input
                        id="display-name"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="输入你的昵称"
                        maxLength={20}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>选择头像</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`
                              relative rounded-lg p-2 transition-all
                              ${selectedAvatar === avatar 
                                ? 'ring-2 ring-primary bg-primary/10' 
                                : 'hover:bg-muted border border-border'
                              }
                            `}
                          >
                            <Avatar className="h-16 w-16 mx-auto">
                              <AvatarImage src={avatar} />
                            </Avatar>
                            {selectedAvatar === avatar && (
                              <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={onSaveProfile}
                      disabled={isSaving || !editDisplayName.trim()}
                    >
                      {isSaving ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight truncate text-white">
                {displayName}
              </h3>
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                <Trophy className="h-3 w-3 text-warning" />
                <span className="text-[10px] text-muted-foreground">AI预测精英</span>
              </div>
            </div>
          </div>
          
          {/* Profit Badge */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground whitespace-nowrap">{t('simulated_profit')}</span>
            <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-mono-data font-bold text-[10px] sm:text-xs ${
              profit >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            }`}>
              {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
        
        <div className="space-y-2.5 sm:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{t('win_rate')}</span>
              <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all" style={{ color: 'hsl(142 76% 36%)' }}>
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-2 sm:h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${animatedWinRate}%`,
                  backgroundColor: 'hsl(142 76% 36%)'
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/50 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-success">
                {correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data">
                {totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-destructive">
                {totalPredictions - correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Start Prediction Button */}
          {onNavigateToMatches && (
            <div className="pt-2 sm:pt-2.5 border-t border-border/50">
              <Button 
                onClick={onNavigateToMatches}
                className="w-full h-9 sm:h-10 relative overflow-hidden group/btn border font-bold text-[10px] sm:text-xs hover:scale-105 transition-transform"
                style={{
                  background: `linear-gradient(to right, ${buttonGradientStart}, ${buttonGradientEnd})`,
                  borderColor: buttonBorderColor,
                  color: 'hsl(255 100% 100%)',
                }}
              >
                {/* Football field pattern overlay */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url(${footballFieldBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                
                <div className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                  <PlayCircle size={13} className="sm:w-[14px] sm:h-[14px] group-hover/btn:animate-pulse" />
                  <span>开始预测</span>
                </div>
                
                {/* Animated shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PlayerStarCard;
