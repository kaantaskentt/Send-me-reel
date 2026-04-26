/*
 * Home — ContextDrop landing page (Manus "Warm Signal" port, Apr 26)
 * Section order: NavBar → Hero → StatsBar → Problem → HowItWorks → Verdict → FinalCTA + Footer
 */

import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import VerdictSection from "@/components/landing/VerdictSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <ProblemSection />
      <HowItWorksSection />
      <VerdictSection />
      <FinalCTASection />
    </div>
  );
}
