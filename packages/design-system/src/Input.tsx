import type { ComponentProps } from 'react';
import { useContext } from 'react';
import { cx } from 'class-variance-authority';
import { formFieldContext } from './FormField';

export type InputProps = ComponentProps<'input'>;

export function Input({ className, ...props }: InputProps) {
  const formField = useContext(formFieldContext);
  return (
    <input
      aria-describedby={formField?.descriptionId}
      aria-invalid={formField?.isInvalid}
      className={cx(
        'text-gray-900 w-full px-4 py-2 rounded-lg border border-gray-300',
        'hover:border-blue-700',
        'invalid:border-red-700',
        'focus:border-blue-700',
        'placeholder:text-gray-400',
        'disabled:bg-gray-50 border-gray-300',
        {
          'border-red-700': formField?.isInvalid,
        },
        className
      )}
      id={formField?.inputId}
      {...props}
    />
  );
}
