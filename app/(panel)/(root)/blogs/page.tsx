import { getAppName } from '@/lib/utils/general-settings';
import BlogPage from '@/components/frontend/blogs/page';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const appName = (await getAppName()) || 'SMM Panel';
  const title = `Latest Articles on Social Media Strategies - ${appName}`;
  const description = `Explore insights and trends on the ${appName} blog. Stay informed with our latest articles on social media strategies and digital marketing.`;
  return {
    title: 'Blog',
    description,
    openGraph: { title, description, type: 'website', url: '/blogs' },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
    alternates: { canonical: '/blogs' },
  };
}

export default function BlogPageWrapper() {
  return <BlogPage />;
}
