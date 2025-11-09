import { useTranslation } from "react-i18next";

const Disclaimer = () => {
  const { t } = useTranslation();
  
  return (
    <div className="mt-8 mb-6 text-center px-4">
      <p className="text-xs sm:text-sm text-muted-foreground/80">
        {t("disclaimer_text")}
      </p>
    </div>
  );
};

export default Disclaimer;
