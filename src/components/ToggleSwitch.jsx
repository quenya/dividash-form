import React from 'react';

function ToggleSwitch({ checked, onChange, label, icon = null }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-label">
        {icon}
        {label}
      </span>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
    </button>
  );
}

export default ToggleSwitch;
