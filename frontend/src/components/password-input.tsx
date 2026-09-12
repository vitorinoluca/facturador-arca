"use client";

import { useState } from "react";

// Mismo input de contraseña que ya se repetía en login/register/reset-password,
// con un botón de mostrar/ocultar — evita que el usuario tenga que escribirla a
// ciegas dos veces (registro) o adivinar si tipeó bien.
export function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full border border-line bg-surface px-3 py-2 pr-16 text-sm text-ink focus:border-accent focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-ink-muted hover:text-ink"
      >
        {visible ? "ocultar" : "mostrar"}
      </button>
    </div>
  );
}
