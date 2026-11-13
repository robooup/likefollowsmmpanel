'use client';

import { FaBolt, FaHeadset, FaMedal, FaTags } from 'react-icons/fa';
import { AppName } from '@/components/app-name';
import { useHomepageStats } from '@/hooks/use-homepage-stats';
import CarbonSignInForm from './sign-in-form';

const REASONS = [
  { Icon: FaMedal, title: 'Highest quality', text: 'Services are checked regularly so you get what you ordered.' },
  { Icon: FaTags, title: 'Best price', text: 'Low rates on every service, with no hidden fees.' },
  { Icon: FaBolt, title: 'Fastest delivery', text: 'Most orders start within minutes of being placed.' },
  { Icon: FaHeadset, title: 'Full-time support', text: 'Open a ticket any time and our team will help you.' },
];

const STEPS = [
  { title: 'Sign up', text: 'Create your account and sign in.' },
  { title: 'Add funds', text: 'Top up your balance with the payment method you prefer.' },
  { title: 'Choose a service', text: 'Pick a service and place your order.' },
  { title: 'Get results', text: 'Watch your order progress and enjoy the results.' },
];

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** Home page of the Carbon theme: sign-in in the hero, then stats, reasons and steps. */
export default function CarbonLanding() {
  const { data } = useHomepageStats();
  const stats = [
    { label: 'Total services', value: data?.activeServices || 0 },
    { label: 'Total orders', value: data?.totalOrders || data?.completedOrders || 0 },
    { label: 'Happy users', value: data?.totalUsers || data?.activeUsers || 0 },
  ].filter((item) => item.value > 0);

  return (
    <div className="cb-landing">
      <section className="cb-hero">
        <div className="cb-hero-copy">
          <h1 className="cb-hero-title">
            The social media panel <span>built for growth</span>
          </h1>
          <p className="cb-hero-text">
            <AppName /> gives you fast, affordable social media services in one dashboard. Sign in, pick a service and
            your order starts automatically.
          </p>
        </div>
        <div className="cb-card cb-hero-card">
          <h2 className="cb-card-title">Sign in</h2>
          <CarbonSignInForm />
        </div>
      </section>

      {stats.length > 0 && (
        <section className="cb-stats">
          {stats.map((item) => (
            <div key={item.label} className="cb-card cb-stat">
              <strong>{compact.format(item.value)}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>
      )}

      <section className="cb-section">
        <h2 className="cb-section-title">Why choose us?</h2>
        <div className="cb-grid-4">
          {REASONS.map(({ Icon, title, text }) => (
            <div key={title} className="cb-card cb-feature">
              <span className="cb-feature-icon">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cb-section">
        <h2 className="cb-section-title">How to use</h2>
        <div className="cb-grid-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="cb-card cb-feature">
              <span className="cb-step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
