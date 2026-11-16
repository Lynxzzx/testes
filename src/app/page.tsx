import { Hero } from "@/components/landing/hero";
import {
  Examples,
  Faq,
  Features,
  FinalCta,
  HowItWorks,
  Pricing,
  SiteFooter,
  SocialProof,
} from "@/components/landing/sections";
import { SiteHeader } from "@/components/landing/site-header";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await auth();
  return (
    <>
      <SiteHeader loggedIn={!!session?.user} />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Examples />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
