import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import MatchCenter from "@/components/MatchCenter";

export default function Models() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground text-center">
            {t('match_schedule')}
          </h1>
          <div className="w-full h-px bg-border"></div>
        </div>
        
        <MatchCenter />
      </main>
    </div>
  );
}
