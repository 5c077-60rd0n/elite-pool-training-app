import { Button } from './Button';

type NumberStepperFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  className?: string;
};

function clampNumber(value: number, min?: number, max?: number): number {
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
}

export function NumberStepperField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 0,
  className = '',
}: NumberStepperFieldProps) {
  const decreaseDisabled = typeof min === 'number' && value <= min;
  const increaseDisabled = typeof max === 'number' && value >= max;

  const update = (nextValue: number): void => {
    const clamped = clampNumber(nextValue, min, max);
    const normalized = decimals > 0 ? Number(clamped.toFixed(decimals)) : Math.round(clamped);
    onChange(normalized);
  };

  return (
    <label className={`text-sm text-chalk-300 ${className}`}>
      {label}
      <div className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => update(value - step)}
          disabled={decreaseDisabled}
          className="min-h-11 px-3"
        >
          -
        </Button>
        <input
          type="number"
          inputMode={decimals > 0 ? 'decimal' : 'numeric'}
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(event) => update(Number(event.target.value) || 0)}
          className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-center text-ivory-100"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => update(value + step)}
          disabled={increaseDisabled}
          className="min-h-11 px-3"
        >
          +
        </Button>
      </div>
    </label>
  );
}
