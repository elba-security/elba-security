'use client';
import { type ComponentProps, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from 'class-variance-authority';

export type SelectProps = ComponentProps<'select'> & {
  /** Don't use this prop if the select have a default value */
  placeholder?: string;
};

export function Select({ className, onChange, placeholder, children, ...props }: SelectProps) {
  // this trick could be removed if we do not care of the color of the placeholder
  const [isPlaceholderSelected, setIsPlaceholderSelected] = useState(Boolean(placeholder));

  const handleChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (event) => {
      if (event.target.value !== '') {
        setIsPlaceholderSelected(false);
      }
      return onChange?.(event);
    },
    [onChange, setIsPlaceholderSelected]
  );

  return (
    <div className={cx('inline-flex relative', className)}>
      <select
        className={cx(
          'border rounded-lg flex-1 border-gray-300 appearance-none px-3 py-2 pr-8',
          isPlaceholderSelected ? 'text-gray-400' : 'text-gray-900'
        )}
        defaultValue={placeholder ? '' : undefined}
        onChange={handleChange}
        {...props}>
        {placeholder ? (
          <option disabled value="">
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <ChevronDown className="text-gray-500 flex-0 h-5 w-5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
    </div>
  );
}
