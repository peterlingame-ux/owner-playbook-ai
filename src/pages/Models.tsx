import Header from "@/components/Header";
import MatchCenter from "@/components/MatchCenter";

export default function Models() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-4 safe-area-padding">
        <MatchCenter />
      </main>
    </div>
  );
}
