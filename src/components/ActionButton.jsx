import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

// Tracks one remote action: idle → loading → success (briefly) → idle. Errors return to idle and are rethrown.
export function useActionStatus(successDuration = 1600) {
  const [status, setStatus] = useState('idle');
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const run = useCallback(async (task, { showSuccess = true } = {}) => {
    clearTimeout(timer.current);
    setStatus('loading');
    try {
      const result = await task();
      if (showSuccess) {
        setStatus('success');
        timer.current = setTimeout(() => setStatus('idle'), successDuration);
      } else {
        setStatus('idle');
      }
      return result;
    } catch (error) {
      setStatus('idle');
      throw error;
    }
  }, [successDuration]);

  return [status, run];
}

// Shows the action's state in place. Every label sits in the same grid cell so the button width stays put.
function ActionButton({
  status = 'idle',
  label,
  loadingLabel,
  successLabel,
  icon = null,
  className = '',
  disabled = false,
  ...buttonProps
}) {
  const states = [
    { key: 'idle', icon, text: label },
    loadingLabel && { key: 'loading', icon: <Loader2 size={16} className="icon-spin" aria-hidden="true" />, text: loadingLabel },
    successLabel && { key: 'success', icon: <Check size={16} aria-hidden="true" />, text: successLabel },
  ].filter(Boolean);
  const active = states.some((state) => state.key === status) ? status : 'idle';

  return (
    <>
      <button
        {...buttonProps}
        className={`action-button ${className}`.trim()}
        data-status={active}
        disabled={disabled || status === 'loading'}
        aria-busy={status === 'loading'}
      >
        <span className="action-button-stack">
          {states.map((state) => (
            <span
              key={state.key}
              className="action-button-state"
              data-active={state.key === active}
              aria-hidden={state.key !== active}
            >
              {state.icon}
              {state.text}
            </span>
          ))}
        </span>
      </button>
      <span className="visually-hidden" role="status">
        {active === 'success' ? successLabel : ''}
      </span>
    </>
  );
}

export default ActionButton;
