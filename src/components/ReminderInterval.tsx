import { useEffect, useState } from "react";

/** Keep an editable draft so clearing the field does not insert a premature 1. */
export function ReminderInterval({
  label,
  minutes,
  onChange,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const [draft, setDraft] = useState(String(minutes));
  useEffect(() => setDraft(String(minutes)), [minutes]);
  function commit() {
    const value = Math.max(1, Math.min(240, Math.round(Number(draft) || 1)));
    setDraft(String(value));
    onChange(value);
  }
  return (
    <div className="interval-input">
      <input
        aria-label={label}
        type="number"
        min={1}
        max={240}
        step={1}
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          const number = Number(value);
          if (value && Number.isInteger(number) && number >= 1 && number <= 240)
            onChange(number);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <span aria-hidden="true">minutes</span>
    </div>
  );
}
