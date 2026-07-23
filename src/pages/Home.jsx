import { useState } from "react";
import BannerCarousel from "../components/home/BannerCarousel";
import HealthConcernStrip from "../components/home/HealthConcernStrip";
import TrustStrip from "../components/home/TrustStrip";
import FlashSale from "../components/home/FlashSale";
import BrandShowcase from "../components/home/BrandShowcase";
import BestsellersTabs from "../components/home/BestsellersTabs";
import ShopAllProductsCTA from "../components/home/ShopAllProductsCTA";
import PrescriptionCTA from "../components/home/PrescriptionCTA";
import Testimonials from "../components/home/Testimonials";
import PrescriptionModal from "../components/PrescriptionModal";

export default function Home() {
  const [rxOpen, setRxOpen] = useState(false);

  return (
    <div>
      <BannerCarousel />
      <HealthConcernStrip />
      <TrustStrip />
      <FlashSale />
      <BrandShowcase />
      <BestsellersTabs />
      <ShopAllProductsCTA />
      <PrescriptionCTA onOpen={() => setRxOpen(true)} />
      <Testimonials />
      <PrescriptionModal open={rxOpen} onClose={() => setRxOpen(false)} />
    </div>
  );
}
