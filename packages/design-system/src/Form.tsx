import type { ComponentProps } from 'react';
import { cx } from 'class-variance-authority';

export type FormProps = ComponentProps<'form'>;

export function Form({ className, ...props }: FormProps) {
  return <form className={cx('flex flex-col items-start gap-4 my-2', className)} {...props} />;
}
