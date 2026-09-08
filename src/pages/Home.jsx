import BannerCarousel from "../components/home/BannerCarousel";
import HealthConcernStrip from "../components/home/HealthConcernStrip";
import TrustStrip from "../components/home/TrustStrip";
import FlashSale from "../components/home/FlashSale";
import BrandShowcase from "../components/home/BrandShowcase";
import BestsellersTabs from "../components/home/BestsellersTabs";
import ShopAllProductsCTA from "../components/home/ShopAllProductsCTA";
import Testimonials from "../components/home/Testimonials";
import { useSeo } from "../utils/useSeo";

export default function Home() {
  useSeo({ path: "/" });

  return (
    <div>
      <BannerCarousel />
      <HealthConcernStrip />
      <TrustStrip />
      <FlashSale />
      <BrandShowcase />
      <BestsellersTabs />
      <ShopAllProductsCTA />
      <Testimonials />
    </div>
  );
}
