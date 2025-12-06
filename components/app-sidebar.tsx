'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Package,
  Box,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  Database,
  FileText,
  FileCode,
  GalleryVerticalEnd,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  AlertTriangle,
  Edit,
  RotateCcw,
  Truck,
  RefreshCw,
} from 'lucide-react';
import { NavDocuments } from '@/components/nav-documents';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { APP_CONFIG, APP_PATHS, MENU_ITEMS } from '@/lib/constants';
import type { RootState } from '@/store/store';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Package,
  Box,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  Database,
  FileText,
  FileCode,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  AlertTriangle,
  Edit,
  RotateCcw,
  Truck,
  RefreshCw,
};

const navMainItems = MENU_ITEMS.map((item) => ({
  title: item.title,
  url: item.url,
  icon: iconMap[item.icon] || LayoutDashboard,
  children: item.children?.map((child) => ({
    title: child.title,
    url: child.url,
    icon: iconMap[child.icon] || LayoutDashboard,
  })),
}));

const navSecondaryItems = [
  {
    title: 'Settings',
    url: APP_PATHS.SETTINGS,
    icon: Settings,
  },
];

/**
 * AppSidebar component renders the main application sidebar with dynamic menu items,
 * navigation sections, and user profile. All menu items and paths are loaded from constants.
 * Uses Redux to get current user information.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSelector((state: RootState) => state.auth);

  const userData = {
    name: user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    avatar: '/avatars/default.jpg',
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href={APP_PATHS.DASHBOARD}>
                <GalleryVerticalEnd className="!size-5" />
                <span className="text-base font-semibold">
                  {APP_CONFIG.COMPANY_NAME}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
