'use client';

import { Shield, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Shield,
    text: 'Secure Authentication',
    delay: 'delay-0',
  },
  {
    icon: Lock,
    text: 'Encrypted Data',
    delay: 'delay-150',
  },
  {
    icon: KeyRound,
    text: 'Protected Access',
    delay: 'delay-300',
  },
  {
    icon: CheckCircle2,
    text: 'Verified System',
    delay: 'delay-500',
  },
];

/**
 * AuthFeatures component displays animated security features on the login page.
 * Shows icons with smooth animations to emphasize secure authentication.
 */
export function AuthFeatures() {
  return (
    <div className="grid grid-cols-2 gap-4 p-6">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <Card
            key={index}
            className={cn(
              'group relative overflow-hidden border-2 transition-all duration-500 hover:shadow-lg hover:scale-105',
              'animate-in fade-in slide-in-from-bottom-4',
              feature.delay
            )}
          >
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl group-hover:bg-primary/30 transition-colors" />
                <div className="relative rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="size-6 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors">
                {feature.text}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
