import { redirect } from 'next/navigation';
import { APP_PATHS } from '@/lib/constants';

/**
 * Home page redirects to the dashboard to ensure users land on the main application page.
 */
export default function Home() {
  redirect(APP_PATHS.DASHBOARD);
}
