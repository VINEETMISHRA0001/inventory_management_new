'use client';

import { Shield, Lock, KeyRound, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const floatingElements = [
  {
    icon: Shield,
    position: 'top-20 left-10',
    delay: 'delay-0',
    size: 'size-16',
    color: 'text-blue-500/20',
  },
  {
    icon: Lock,
    position: 'top-40 right-16',
    delay: 'delay-300',
    size: 'size-20',
    color: 'text-green-500/20',
  },
  {
    icon: KeyRound,
    position: 'bottom-40 left-20',
    delay: 'delay-600',
    size: 'size-14',
    color: 'text-purple-500/20',
  },
  {
    icon: CheckCircle2,
    position: 'bottom-20 right-12',
    delay: 'delay-900',
    size: 'size-16',
    color: 'text-orange-500/20',
  },
  {
    icon: Sparkles,
    position: 'top-1/2 left-1/4',
    delay: 'delay-1200',
    size: 'size-12',
    color: 'text-pink-500/20',
  },
];

/**
 * AuthFloatingElements component displays animated floating security icons.
 * Creates a modern, minimalist design with smooth floating animations.
 */
export function AuthFloatingElements() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {floatingElements.map((element, index) => {
        const Icon = element.icon;
        return (
          <div
            key={index}
            className={cn(
              'absolute',
              element.position,
              'animate-in fade-in zoom-in duration-1000',
              element.delay,
              'animate-[float_6s_ease-in-out_infinite]'
            )}
            style={{
              animationDelay: `${index * 0.3}s`,
            }}
          >
            <div
              className={cn(
                'relative',
                element.size,
                'flex items-center justify-center',
                'rounded-full bg-background/50 backdrop-blur-sm',
                'border border-border/50 shadow-lg',
                'group hover:scale-110 transition-transform duration-300'
              )}
            >
              <Icon
                className={cn(
                  'absolute inset-0 m-auto',
                  element.size,
                  element.color,
                  'group-hover:text-primary/40 transition-colors'
                )}
              />
              <Icon
                className={cn(
                  'relative z-10',
                  'size-6 text-primary/60',
                  'group-hover:text-primary group-hover:scale-110 transition-all'
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

