import type { ComponentProps } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva, cx } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';

const button = cva(
  [
    'group inline-flex items-center px-4 py-2 gap-2 rounded-md text-md cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-50 ',
  ],
  {
    variants: {
      variant: {
        primary: ['bg-gray-900 disabled:bg-gray-900 text-white', 'hover:bg-gray-600'],
        secondary: [
          'bg-white disabled:bg-white border border-gray-200 text-gray-900',
          'hover:border-gray-400 hover:text-gray-600',
        ],
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>;

export function Button({ className, variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button className={cx(button({ variant }), className)} type="button" {...props}>
      {children}
      <LoaderCircle className="text-white h-4 w-4 hidden group-aria-busy:inline-block group-aria-busy:animate-spin" />
    </button>
  );
}
