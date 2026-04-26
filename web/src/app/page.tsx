/*
 * Home — ContextDrop landing page (Manus "Dark Signal" port, Apr 26)
 * Section order: NavBar → Hero → StatsBar → Problem → HowItWorks → DashboardPreview
 *                → Personas → Pricing → Testimonials → FinalCTA + Footer
 * Background #0a0a0a. Orange-only accent. Inter 800 headlines, JetBrains Mono labels.
 */

import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DashboardPreviewSection from "@/components/landing/DashboardPreviewSection";
import PersonasSection from "@/components/landing/PersonasSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <ProblemSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <PersonasSection />
      <PricingSection />
      <TestimonialsSection />
      <FinalCTASection />
    </div>
  );
}
