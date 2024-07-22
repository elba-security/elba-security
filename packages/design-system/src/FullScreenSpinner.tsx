import type { ComponentProps } from 'react';
import { cx } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';

export type FullScreenSpinnerProps = ComponentProps<'div'>;

export function FullScreenSpinner({ className, children, ...props }: FullScreenSpinnerProps) {
  return (
    <div
      aria-busy="true"
      className={cx('flex flex-col h-full w-full gap-4 items-center justify-center', className)}
      {...props}>
      <LoaderCircle className="text-blue-500 h-16 w-16 animate-spin" />
      {children}
    </div>
  );
}
