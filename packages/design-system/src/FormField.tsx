'use client';

import type { ComponentProps } from 'react';
import { createContext, useId } from 'react';
import { cx } from 'class-variance-authority';

type FormFieldContextValue = {
  inputId: string;
  descriptionId: string;
  isInvalid: boolean;
};

export const formFieldContext = createContext<FormFieldContextValue | null>(null);

export type FormFieldProps = ComponentProps<'div'> & {
  isInvalid?: boolean;
};

export function FormField({ className, isInvalid = false, ...props }: FormFieldProps) {
  const inputId = useId();
  return (
    <formFieldContext.Provider
      value={{ inputId, descriptionId: `${inputId}-description`, isInvalid }}>
      <div className={cx('w-full flex flex-col gap-1', className)} role="group" {...props} />
    </formFieldContext.Provider>
  );
}
