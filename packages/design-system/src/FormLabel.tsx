'use client';

import type { ComponentProps } from 'react';
import { useContext } from 'react';
import { cx } from 'class-variance-authority';
import { formFieldContext } from './FormField';

export type FormLabelProps = ComponentProps<'label'>;

export function FormLabel({ className, ...props }: FormLabelProps) {
  const formField = useContext(formFieldContext);

  return (
    <label
      className={cx(
        'block text-gray-900 text-lg font-medium me-3 first-letter:uppercase',
        className
      )}
      htmlFor={formField?.inputId}
      {...props}
    />
  );
}
