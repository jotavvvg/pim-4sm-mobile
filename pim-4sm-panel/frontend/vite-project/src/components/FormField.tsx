type FormFieldProps = {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'checkbox' | 'select';
  value?: string | number | boolean;
  onChange?: (value: string | number | boolean) => void;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
};

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  options = [],
  min,
}: FormFieldProps) {
  if (type === 'checkbox') {
    return (
      <label className="field checkbox-field" htmlFor={name}>
        <input
          id={name}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className="field" htmlFor={name}>
        <span>{label}</span>
        <select
          id={name}
          value={String(value ?? '')}
          onChange={(event) => onChange?.(event.target.value)}
        >
          <option value="">Selecione...</option>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field" htmlFor={name}>
      <span>{label}</span>
      <input
        id={name}
        type={type}
        value={String(value ?? '')}
        min={min}
        placeholder={placeholder}
        onChange={(event) => {
          const nextValue = type === 'number' ? Number(event.target.value) : event.target.value;
          onChange?.(nextValue);
        }}
      />
    </label>
  );
}
