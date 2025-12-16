import prizeBannerGreen from "@/assets/prize-banner-green.png";

const AdCarousel = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-card/50 border border-border/50">
      {/* Static Banner Image */}
      <div className="relative aspect-[21/9] sm:aspect-[3/1] lg:aspect-[4/1] overflow-hidden">
        <img
          src={prizeBannerGreen}
          alt="Prize Banner"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default AdCarousel;