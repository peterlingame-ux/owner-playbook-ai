import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { TrendingUp, Share2, Bell, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Match } from "@/types/prediction";

interface MatchContextMenuProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onViewDetails: () => void;
  onShare: () => void;
  onSetReminder: () => void;
  onAddFavorite: () => void;
}

export const MatchContextMenu = ({
  match,
  isOpen,
  onClose,
  position,
  onViewDetails,
  onShare,
  onSetReminder,
  onAddFavorite
}: MatchContextMenuProps) => {
  const { t } = useTranslation();

  if (!match) return null;

  const menuItems = [
    {
      icon: TrendingUp,
      label: t('view_details') || '查看详情',
      action: onViewDetails
    },
    {
      icon: Share2,
      label: t('share') || '分享',
      action: onShare
    },
    {
      icon: Bell,
      label: t('set_reminder') || '设置提醒',
      action: onSetReminder
    },
    {
      icon: Star,
      label: t('add_favorite') || '添加收藏',
      action: onAddFavorite
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed z-50"
            style={{
              left: Math.min(position.x, window.innerWidth - 200),
              top: Math.min(position.y, window.innerHeight - 250)
            }}
          >
            <Card className="w-48 p-2 shadow-lg border-border/60 bg-card/95 backdrop-blur">
              <div className="space-y-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
