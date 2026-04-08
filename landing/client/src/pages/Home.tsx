/*
 * Home — ContextDrop "Design B Simplified"
 * Simple, social-native, 5 sections max
 * Section order: NavBar → Hero (video bg + bookmark transform mockup) → StatsBar → HowItWorks (sweep cards) → Verdict (animated chat) → FinalCTA (video bookend) + Footer
 */

import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import VerdictSection from "@/components/VerdictSection";
import FinalCTASection from "@/components/FinalCTASection";

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
