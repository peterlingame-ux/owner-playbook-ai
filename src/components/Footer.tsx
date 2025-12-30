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

const Footer = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<FooterDialogType>(null);

  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { key: 'terms', label: t('footer_terms') },
    { key: 'privacy', label: t('footer_privacy') },
    { key: 'disclaimer', label: t('footer_disclaimer') },
    { key: 'contact', label: t('footer_contact') },
    { key: 'faq', label: t('footer_faq') },
  ];

  return (
    <>
      <footer className="border-t border-border/30 bg-background/50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Links Row */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-8 mb-4 sm:mb-6">
            {footerLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => setOpenDialog(link.key as FooterDialogType)}
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground/60">
              © {currentYear} HUNSOCCER. {t('footer_rights')}
            </p>
            <p className="text-[10px] text-muted-foreground/40 max-w-2xl mx-auto leading-relaxed">
              {t('footer_risk_warning')}
            </p>
          </div>
        </div>
      </footer>

      {/* Terms of Service Dialog */}
      <Dialog open={openDialog === 'terms'} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('footer_terms')}</DialogTitle>
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
            <DialogTitle>{t('footer_privacy')}</DialogTitle>
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
            <DialogTitle>{t('footer_disclaimer')}</DialogTitle>
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
            <DialogTitle>{t('footer_contact')}</DialogTitle>
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
            <DialogTitle>{t('footer_faq')}</DialogTitle>
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

export default Footer;
