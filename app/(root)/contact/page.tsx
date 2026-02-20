import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import PublicContactSystemGuard from '@/components/public-contact-system-guard';

const Hero = dynamic(() => import('@/components/frontend/contact/hero'), {
  loading: () => null,
});
const HowToContact = dynamic(() => import('@/components/frontend/contact/how-to-contact'), {
  loading: () => null,
});

export const metadata: Metadata = {
  title: 'Contact Us - Like Follow SMM Panel',
  description: 'Get in touch with Like Follow SMM Panel for all your social media marketing needs. We\'re here to help you grow your online presence.',
};

export default function ContactPage() {
  return (
    <PublicContactSystemGuard>
      <Hero />
      <HowToContact />
    </PublicContactSystemGuard>
  );
}
