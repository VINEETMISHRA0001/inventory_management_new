'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { APP_PATHS, FORM_MESSAGES, FORM_PLACEHOLDERS } from '@/lib/constants';
import { loginUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';

export interface LoginFormProps extends React.ComponentProps<'form'> {
  className?: string;
}

/**
 * LoginForm component handles user authentication with email and password.
 * On successful login, redirects to dashboard and stores authentication state in Redux.
 */
export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await dispatch(loginUser({ email, password, rememberMe })).unwrap();
      router.push(APP_PATHS.DASHBOARD);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative bg-primary/10 p-4 rounded-full border border-primary/20">
              <Shield className="size-8 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{FORM_MESSAGES.LOGIN_TITLE}</h1>
            <p className="text-muted-foreground text-sm text-balance">
              {FORM_MESSAGES.LOGIN_DESCRIPTION}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder={FORM_PLACEHOLDERS.EMAIL}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </Field>

        <Field>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
        </Field>

        <Field>
          <Button type="submit" disabled={isLoading} className="h-12 text-base">
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
