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
      <DialogContent className="max-w-[95vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-gradient-to-b from-background via-background to-muted/30">
        {/* Header */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {isVipActive ? t('vip_active') : t('open_vip')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1 text-xs sm:text-sm">
              {isVipActive 
                ? t('vip_enjoy_privileges')
                : t('vip_unlock_privileges')
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Privileges List - Compact */}
        <div className="px-3 sm:px-4 pb-2 sm:pb-3 space-y-1.5 sm:space-y-2">
          {privileges.map((privilege, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/30 border border-border/50"
            >
              <div 
                className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br ${privilege.color} flex items-center justify-center shadow-md`}
              >
                <privilege.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-foreground text-xs sm:text-sm">{privilege.title}</h3>
                  {isVipActive && (
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{privilege.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Price and Purchase Button */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1 border-t border-border/30 bg-background/80">
          {!isVipActive && (
            <>
              {/* Price Display */}
              <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3 p-2 rounded-lg bg-muted/50 border border-border/30">
                <span className="text-muted-foreground text-xs">{t('vip_price')}:</span>
                <div className="flex items-center gap-1">
                  <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-lg sm:text-xl font-bold text-primary">{VIP_COST}</span>
                </div>
                <span className="text-muted-foreground text-xs">/ {VIP_DURATION_DAYS}{t('days')}</span>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchaseVip}
                disabled={isPurchasing}
                className="w-full h-9 sm:h-10 text-sm sm:text-base font-bold relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(195 85% 55%) 0%, hsl(210 90% 60%) 100%)',
                  boxShadow: '0 4px 15px rgba(80, 180, 220, 0.4)',
                }}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  t('open_vip_now')
                )}
              </Button>
            </>
          )}

          {isVipActive && (
            <div className="text-center p-2 sm:p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-foreground text-sm">{t('vip_status_active')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('enjoy_all_privileges')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VipSubscriptionDialog;
