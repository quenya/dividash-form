import React, { useLayoutEffect, useRef, useState } from 'react';

// A group of toggle buttons with a sliding indicator under the selected option.
function SegmentedControl({ options, value, onChange, label, variant = 'pill', className = '' }) {
  const groupRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return undefined;

    const measure = () => {
      const selected = group.querySelector('[aria-pressed="true"]');
      setIndicator(selected ? { x: selected.offsetLeft, width: selected.offsetWidth } : null);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <div ref={groupRef} role="group" aria-label={label} className={`segmented segmented--${variant} ${className}`.trim()}>
      {indicator && (
        <span
          className="segmented-indicator"
          aria-hidden="true"
          style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented-option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
