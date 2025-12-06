'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface NavMainItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavMainItem[];
}

/**
 * NavMain component renders the primary navigation menu items in the sidebar.
 * Supports expandable submenus for nested navigation items.
 */
export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const IconComponent = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
            const [isOpen, setIsOpen] = useState(isActive);

            if (hasChildren) {
              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={setIsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={cn(
                          'w-full justify-between',
                          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="size-4" />}
                          <span>{item.title}</span>
                        </div>
                        <ChevronRight
                          className={cn(
                            'ml-auto size-4 transition-transform duration-200',
                            isOpen && 'rotate-90'
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
                        {item.children?.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = pathname === child.url;
                          return (
                            <SidebarMenuItem key={child.title}>
                              <SidebarMenuButton
                                tooltip={child.title}
                                asChild
                                className={cn(
                                  'h-9',
                                  isChildActive &&
                                    'bg-sidebar-accent text-sidebar-accent-foreground'
                                )}
                              >
                                <Link href={child.url}>
                                  {ChildIcon && <ChildIcon className="size-4" />}
                                  <span className="text-sm">{child.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  className={cn(
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <Link href={item.url}>
                    {IconComponent && <IconComponent className="size-4" />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
