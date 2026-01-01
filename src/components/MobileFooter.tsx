import { useTranslation } from "react-i18next";

const MobileFooter = () => {
  const { t } = useTranslation();

  const footerLinks = [
    { label: t('user_agreement') || '用户协议', href: '#' },
    { label: t('privacy_policy') || '隐私政策', href: '#' },
    { label: t('disclaimer') || '免责声明', href: '#' },
    { label: t('contact_us') || '联系我们', href: '#' },
    { label: t('faq') || '常见问题', href: '#' },
  ];

  return (
    <footer className="w-full bg-background border-t border-border/30 py-6 px-4 pb-24">
      {/* Links Row - Responsive wrap */}
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-4">
        {footerLinks.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            {link.label}
          </a>
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
  );
};

export default MobileFooter;
