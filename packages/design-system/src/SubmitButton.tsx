'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cx } from 'class-variance-authority';
import type { ButtonProps } from './Button';
import { Button } from './Button';

export type SubmitButtonProps = Omit<ButtonProps, 'variant' | 'children'> & {
  children: ReactNode;
};

export function SubmitButton({ className, children, ...props }: SubmitButtonProps) {
  const formStatus = useFormStatus();

  return (
    <Button
      className={cx('mt-3', className)}
      disabled={formStatus.pending}
      type="submit"
      {...props}
      aria-busy={formStatus.pending}>
      {children}
    </Button>
  );
}
