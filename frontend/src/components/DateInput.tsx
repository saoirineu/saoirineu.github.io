import { useRef } from 'react';

import { datePlaceholder, formatIsoDate } from '../lib/dateFormat';
import { useSiteLocale } from '../providers/useSiteLocale';

/**
 * A date field that shows its value the portal's way for the site language
 * (17/set/2026, Sep/17/2026). A native <input type="date"> draws the date in the
 * browser's language, not the site's, so it stays invisible and only supplies
 * the platform date picker. The value is still YYYY-MM-DD.
 */
export function DateInput({
  id,
  value,
  onChange,
  className = '',
  disabled = false,
  min,
  max,
  pickerStart
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  /** Where an empty field's picker opens, e.g. a plausible birth year instead of today. */
  pickerStart?: string;
}) {
  const { locale } = useSiteLocale();
  const pickerRef = useRef<HTMLInputElement>(null);
  // An empty field's picker opens on pickerStart because the hidden input holds it
  // first. It holds it with a five-digit year (02000-01-01 names the same day): the
  // picker hands back 2000-01-01, so choosing exactly that day still changes the
  // value. Holding 2000-01-01 itself, that choice fired no event and the field stayed empty.
  const pickerOpeningValue = pickerStart ? `0${pickerStart}` : '';

  const openPicker = () => {
    const input = pickerRef.current;
    if (!input || disabled) return;
    if (!value && pickerOpeningValue) input.value = pickerOpeningValue;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
    input.click();
  };

  return (
    <span className="relative block">
      <input
        id={id}
        type="text"
        readOnly
        disabled={disabled}
        className={`${className} ${disabled ? '' : 'cursor-pointer'}`}
        value={formatIsoDate(value, locale)}
        onClick={openPicker}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          } else if ((event.key === 'Backspace' || event.key === 'Delete') && value && !disabled) {
            // The field is read-only, so this is the keyboard's way to empty an optional date.
            event.preventDefault();
            onChange('');
          }
        }}
        placeholder={datePlaceholder(locale)}
      />
      <input
        ref={pickerRef}
        type="date"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-px w-px opacity-0"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={event => {
          if (!value && pickerOpeningValue && event.currentTarget.value === pickerOpeningValue) {
            event.currentTarget.value = '';
          }
        }}
      />
    </span>
  );
}
