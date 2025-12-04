import { useTranslation } from "react-i18next";

const Disclaimer = () => {
  const { t } = useTranslation();
  
  return (
    <div className="py-6 border-t border-border/30">
      <p className="text-xs text-muted-foreground/60 text-center max-w-2xl mx-auto leading-relaxed">
        {t("disclaimer_text")}
      </p>
    </div>
  );
};

export default Disclaimer;
