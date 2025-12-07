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

  // Check if any child is active to determine if parent should be highlighted
  const isAnyChildActive = (children: NavMainItem[] | undefined, pathname: string, parentUrl: string) => {
    if (!children) return false;
    return children.some((child) => {
      // Exact match
      if (pathname === child.url) return true;
      // Path starts with child URL + '/' (nested routes)
      if (pathname?.startsWith(child.url + '/')) return true;
      return false;
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const IconComponent = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            // Check if any child is active
            const childActive = hasChildren ? isAnyChildActive(item.children, pathname, item.url) : false;
            // Parent should NOT be active if any child is active
            // Parent is active only if pathname exactly matches parent URL AND no child is active
            const isExactParentMatch = pathname === item.url;
            const isActive = isExactParentMatch && !childActive;
            // Keep parent expanded if any child is active or if we're on a child path
            const shouldBeOpen = childActive || (hasChildren && pathname?.startsWith(item.url + '/')) || isActive;
            const [isOpen, setIsOpen] = useState(shouldBeOpen);

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
                          (isActive || childActive) && !childActive && 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-foreground font-semibold'
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
                          // Child is active if:
                          // 1. Exact match
                          // 2. Pathname starts with child.url + '/' (nested routes)
                          // 3. Special case: if child.url === parent.url, only match if exact
                          const isExactMatch = pathname === child.url;
                          const isChildPath = child.url !== item.url && pathname?.startsWith(child.url + '/');
                          const isChildActive = isExactMatch || isChildPath;
                          return (
                            <SidebarMenuItem key={child.title}>
                              <SidebarMenuButton
                                tooltip={child.title}
                                asChild
                                className={cn(
                                  'h-9',
                                  isChildActive &&
                                    'bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-foreground font-semibold border-l-2 border-primary'
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
                    isActive && 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-foreground font-semibold'
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
