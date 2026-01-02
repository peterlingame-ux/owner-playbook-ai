import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Camera, Eye, Sparkles, Star, MessageCircle, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";

interface VipSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVipActive: boolean;
  onVipPurchased?: () => void;
}

const VIP_COST = 999; // Hunter Coin cost for VIP
const VIP_DURATION_DAYS = 30;

const VipSubscriptionDialog = ({ open, onOpenChange, isVipActive, onVipPurchased }: VipSubscriptionDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const privileges = [
    {
      icon: Camera,
      title: t('vip_privilege_avatar'),
      description: t('vip_privilege_avatar_desc'),
      color: 'from-pink-500 to-rose-500',
    },
    {
      icon: Eye,
      title: t('vip_privilege_matches'),
      description: t('vip_privilege_matches_desc'),
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Sparkles,
      title: t('vip_privilege_entrance'),
      description: t('vip_privilege_entrance_desc'),
      color: 'from-purple-500 to-violet-500',
    },
    {
      icon: Star,
      title: t('vip_privilege_glow'),
      description: t('vip_privilege_glow_desc'),
      color: 'from-yellow-500 to-amber-500',
    },
    {
      icon: MessageCircle,
      title: t('vip_privilege_dm'),
      description: t('vip_privilege_dm_desc'),
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const handlePurchaseVip = async () => {
    if (!user) {
      toast.error(t('please_login'));
      return;
    }

    setIsPurchasing(true);
    try {
      // Call the purchase_vip database function
      const { data, error } = await supabase.rpc('purchase_vip', {
        p_user_id: user.id,
        p_cost: VIP_COST,
        p_duration_days: VIP_DURATION_DAYS,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        toast.success(t('vip_purchase_success'));
        onVipPurchased?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || t('vip_purchase_failed'));
      }
    } catch (error: any) {
      console.error('Error purchasing VIP:', error);
      toast.error(error.message || t('vip_purchase_failed'));
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden border-0 bg-gradient-to-b from-background via-background to-muted/30 max-h-[90vh] flex flex-col">
        {/* Header - Hidden, just spacing */}
        <div className="pt-4 sm:pt-6 flex-shrink-0" />

        {/* Privileges List - Scrollable */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4 space-y-2 sm:space-y-3 overflow-y-auto flex-1 min-h-0">
          {privileges.map((privilege, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div 
                className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${privilege.color} flex items-center justify-center shadow-lg`}
              >
                <privilege.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{privilege.title}</h3>
                  {isVipActive && (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">{privilege.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Price and Purchase Button - Fixed at bottom */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
          {!isVipActive && (
            <>
              {/* Price Display */}
              <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-muted/50 border border-border/30">
                <span className="text-muted-foreground text-sm">{t('vip_price')}:</span>
                <div className="flex items-center gap-1.5">
                  <img src={hunterCoinIcon} alt="Hunter Coin" className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-xl sm:text-2xl font-bold text-primary">{VIP_COST}</span>
                </div>
                <span className="text-muted-foreground text-xs sm:text-sm">/ {VIP_DURATION_DAYS}{t('days')}</span>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchaseVip}
                disabled={isPurchasing}
                className="w-full h-11 sm:h-12 text-base sm:text-lg font-bold relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(195 85% 55%) 0%, hsl(210 90% 60%) 100%)',
                  boxShadow: '0 4px 15px rgba(80, 180, 220, 0.4)',
                }}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {t('open_vip_now')}
                  </>
                )}
                {/* Button shimmer */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </Button>
            </>
          )}

          {isVipActive && (
            <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span className="font-semibold text-foreground text-sm sm:text-base">{t('vip_status_active')}</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('enjoy_all_privileges')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VipSubscriptionDialog;
