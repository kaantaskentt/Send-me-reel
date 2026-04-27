/*
 * Home — ContextDrop landing page (Manus "Dark Signal" port, Apr 26)
 * Stats and Testimonials removed Apr 26 — fabricated numbers and stock-photo
 * quotes broke trust. Re-add only with real data from real users.
 */

import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DashboardPreviewSection from "@/components/landing/DashboardPreviewSection";
import PersonasSection from "@/components/landing/PersonasSection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <PersonasSection />
      <PricingSection />
      <FinalCTASection />
    </div>
  );
}
