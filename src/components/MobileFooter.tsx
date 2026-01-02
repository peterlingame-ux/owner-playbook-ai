import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type FooterDialogType = 'terms' | 'privacy' | 'disclaimer' | 'contact' | 'faq' | null;

const MobileFooter = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<FooterDialogType>(null);

  const footerLinks = [
    { key: 'terms', label: t('user_agreement') || '用户协议' },
    { key: 'privacy', label: t('privacy_policy') || '隐私政策' },
    { key: 'disclaimer', label: t('disclaimer') || '免责声明' },
    { key: 'contact', label: t('contact_us') || '联系我们' },
    { key: 'faq', label: t('faq') || '常见问题' },
  ];

  return (
    <>
      <footer className="w-full bg-background border-t border-border/30 py-4 sm:py-6 px-4 pb-20 sm:pb-24">
        {/* Links Row - Responsive wrap */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-4">
          {footerLinks.map((link) => (
            <button
              key={link.key}
              onClick={() => setOpenDialog(link.key as FooterDialogType)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-3">
          © 2026 HUNSOCCER. {t('all_rights_reserved') || '版权所有'}
        </p>

        {/* Disclaimer */}
        <p className="text-center text-[10px] sm:text-xs text-muted-foreground/70 leading-relaxed max-w-xl mx-auto">
          {t('platform_disclaimer') || '本平台仅用于AI分析和模拟。不提供投注服务，不构成投资建议。结果仅供参考，不保证结果准确性。不提供、不引导任何形式的投注或博彩活动。'}
        </p>
      </footer>

      {/* Terms of Service Dialog */}
      <Dialog open={openDialog === 'terms'} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('user_agreement') || '用户协议'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">{t('terms_acceptance')}</h3>
              <p>{t('terms_acceptance_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('terms_service')}</h3>
              <p>{t('terms_service_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('terms_account')}</h3>
              <p>{t('terms_account_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('terms_conduct')}</h3>
              <p>{t('terms_conduct_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('terms_ip')}</h3>
              <p>{t('terms_ip_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('terms_termination')}</h3>
              <p>{t('terms_termination_content')}</p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={openDialog === 'privacy'} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('privacy_policy') || '隐私政策'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">{t('privacy_collection')}</h3>
              <p>{t('privacy_collection_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('privacy_use')}</h3>
              <p>{t('privacy_use_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('privacy_sharing')}</h3>
              <p>{t('privacy_sharing_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('privacy_security')}</h3>
              <p>{t('privacy_security_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('privacy_cookies')}</h3>
              <p>{t('privacy_cookies_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('privacy_rights')}</h3>
              <p>{t('privacy_rights_content')}</p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Disclaimer Dialog */}
      <Dialog open={openDialog === 'disclaimer'} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('disclaimer') || '免责声明'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">{t('disclaimer_nature')}</h3>
              <p>{t('disclaimer_nature_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('disclaimer_no_gambling')}</h3>
              <p>{t('disclaimer_no_gambling_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('disclaimer_accuracy')}</h3>
              <p>{t('disclaimer_accuracy_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('disclaimer_liability')}</h3>
              <p>{t('disclaimer_liability_content')}</p>
              
              <h3 className="font-semibold text-foreground">{t('disclaimer_age')}</h3>
              <p>{t('disclaimer_age_content')}</p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Contact Us Dialog */}
      <Dialog open={openDialog === 'contact'} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('contact_us') || '联系我们'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t('contact_email')}</h3>
              <p>support@hunsoccer.com</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t('contact_hours')}</h3>
              <p>{t('contact_hours_content')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t('contact_social')}</h3>
              <p>{t('contact_social_content')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={openDialog === 'faq'} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('faq') || '常见问题'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground">{t('faq_q1')}</h3>
                <p>{t('faq_a1')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('faq_q2')}</h3>
                <p>{t('faq_a2')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('faq_q3')}</h3>
                <p>{t('faq_a3')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('faq_q4')}</h3>
                <p>{t('faq_a4')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('faq_q5')}</h3>
                <p>{t('faq_a5')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('faq_q6')}</h3>
                <p>{t('faq_a6')}</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileFooter;
