'use client';

import type { ComponentProps } from 'react';
import { useContext } from 'react';
import { cx } from 'class-variance-authority';
import { formFieldContext } from './FormField';

export type FormErrorMessageProps = ComponentProps<'div'>;

export function FormErrorMessage({ className, ...props }: FormErrorMessageProps) {
  const formField = useContext(formFieldContext);

  return (
    <div
      aria-live="polite"
      className={cx('text-red-700', className)}
      id={formField?.descriptionId}
      {...props}
    />
  );
}
