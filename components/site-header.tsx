'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { APP_CONFIG } from '@/lib/constants';
import type { RootState } from '@/store/store';
import { MapPin, Circle } from 'lucide-react';
import { Notifications } from '@/components/notifications/notifications';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * SiteHeader component renders the top header bar with sidebar trigger,
 * page title, user's current location, and user authentication type badge.
 * Uses Redux to display current user info and browser geolocation for location display.
 */
export function SiteHeader() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [location, setLocation] = useState<string>('Getting location...');
  const [isLocationActive, setIsLocationActive] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation('Location not available');
      return;
    }

    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setIsLocationActive(true);
          
          try {
            // Reverse geocoding using Nominatim (OpenStreetMap)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'InventoryManagement/1.0',
                },
              }
            );
            
            const data = await response.json();
            
            if (data.address) {
              const addressParts = [];
              if (data.address.road) addressParts.push(data.address.road);
              if (data.address.suburb || data.address.neighbourhood) {
                addressParts.push(data.address.suburb || data.address.neighbourhood);
              }
              if (data.address.city || data.address.town || data.address.village) {
                addressParts.push(data.address.city || data.address.town || data.address.village);
              }
              if (data.address.state) addressParts.push(data.address.state);
              
              setLocation(addressParts.length > 0 ? addressParts.join(', ') : data.display_name || 'Location found');
            } else {
              setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } catch (error) {
            // Fallback to coordinates if reverse geocoding fails
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        },
        (error) => {
          setIsLocationActive(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocation('Location permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocation('Location unavailable');
              break;
            case error.TIMEOUT:
              setLocation('Location request timeout');
              break;
            default:
              setLocation('Location error');
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    getLocation();
    
    // Update location periodically (every 5 minutes)
    const interval = setInterval(getLocation, 300000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{APP_CONFIG.APP_NAME}</h1>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <MapPin className="size-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground max-w-[120px] sm:max-w-[200px] truncate">
              {location}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Circle 
                className={`size-2 ${isLocationActive ? 'fill-primary text-primary' : 'fill-muted-foreground text-muted-foreground'}`} 
              />
            </div>
          </div>
          {user && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <ThemeToggle />
              <Separator orientation="vertical" className="h-4" />
              <Notifications />
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Auth Type:</span>
                <Badge variant="outline" className="text-xs">
                  {user.authType === 'google' ? 'Google' : 'Email-Password'}
                </Badge>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
