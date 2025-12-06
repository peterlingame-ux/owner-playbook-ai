import MyPredictionsComponent from "@/components/MyPredictions";
import Header from "@/components/Header";

const MyPredictions = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <MyPredictionsComponent />
      </div>
    </div>
  );
};

export default MyPredictions;
