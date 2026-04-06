import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TryItNowSection from "@/components/landing/TryItNowSection";
import VerdictSection from "@/components/landing/VerdictSection";
import PersonalizationSection from "@/components/landing/PersonalizationSection";
import GroupChatSection from "@/components/landing/GroupChatSection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8" }}>
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <TryItNowSection />
      <VerdictSection />
      <PersonalizationSection />
      <GroupChatSection />
      <PricingSection />
      <FinalCTASection />
    </div>
  );
}
