/*
 * Home — ContextDrop Landing Page
 * Section order: NavBar → Hero → StatsBar → ProblemSection → TransformSection → DashboardPreview → VerdictSection (animation) → FinalCTA + Footer
 * Narrative: Hook → Social proof → Problem → Before/After → See it live → Prove it → Convert
 */

import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ProblemSection from "@/components/ProblemSection";
import DashboardPreviewSection from "@/components/DashboardPreviewSection";
import VerdictSection from "@/components/VerdictSection";
import FinalCTASection from "@/components/FinalCTASection";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <ProblemSection />
      <DashboardPreviewSection />
      <VerdictSection />
      <FinalCTASection />
    </div>
  );
}
