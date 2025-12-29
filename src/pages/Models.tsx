import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MatchCenter from "@/components/MatchCenter";

export default function Models() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-4 safe-area-padding flex-1">
        <MatchCenter />
      </main>
      <Footer />
    </div>
  );
}
