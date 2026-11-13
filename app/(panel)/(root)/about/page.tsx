import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getAppName } from '@/lib/utils/general-settings';

const Hero = dynamic(() => import('@/components/frontend/about/hero'));
const Mission = dynamic(() => import('@/components/frontend/about/mission'));
const Vision = dynamic(() => import('@/components/frontend/about/vision'));
const Team = dynamic(() => import('@/components/frontend/about/team'));
const Services = dynamic(() => import('@/components/frontend/about/services'));
const CTA = dynamic(() => import('@/components/frontend/about/cta'));
const WhyDifferent = dynamic(() => import('@/components/frontend/about/why-different'));

export async function generateMetadata(): Promise<Metadata> {
  const appName = await getAppName();
  return {
    title: 'About Us',
    description: `${appName} is a provider of affordable and effective social media marketing services. Discover our mission, vision, and SMM solutions.`,
    keywords: `About ${appName}, SMM Panel, Social Media Marketing, Affordable SMM Services, Facebook Instagram Twitter YouTube LinkedIn TikTok`,
  };
}

export default function AboutPage() {
  return (
    <main>
      <Hero />
      <Mission />
      <Vision />
      <Team />
      <Services />
      <CTA />
      <WhyDifferent />
    </main>
  );
}
