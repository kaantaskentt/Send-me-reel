import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import ProblemSection from "@/components/landing/ProblemSection";
import DashboardPreviewSection from "@/components/landing/DashboardPreviewSection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <ProblemSection />
      <DashboardPreviewSection />
      <PricingSection />
      <FinalCTASection />
    </div>
  );
}
