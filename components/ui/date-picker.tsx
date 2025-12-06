'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  value?: Date | string;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

/**
 * DatePicker component provides a styled date input using shadcn calendar.
 * Replaces default HTML date inputs with a consistent, accessible date picker.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  required = false,
  id,
  className,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? (typeof value === 'string' ? new Date(value) : value) : undefined
  );

  React.useEffect(() => {
    if (value) {
      setDate(typeof value === 'string' ? new Date(value) : value);
    }
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    onChange?.(selectedDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          required={required}
        />
      </PopoverContent>
    </Popover>
  );
}

