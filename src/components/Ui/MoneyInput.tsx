import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

/** Converte valor em número, aceitando "1.234,56" (mascarado) ou "1234.56" (banco). */
export const parseMoney = (v: string): number => {
  if (!v) return 0;
  if (v.includes(',')) return Number(v.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(v) || 0;
};

/**
 * Campo de valor em reais com máscara automática: o usuário digita e o
 * separador de milhar e a vírgula decimal aparecem sozinhos.
 * Armazena a versão mascarada; use parseMoney para obter o número.
 */
export function MoneyInput({ value, onChange, id, required, placeholder, className }: Props) {
  const [display, setDisplay] = useState(() => format(value));
  const [focused, setFocused] = useState(false);
  const lastEmitted = useRef(value);

  function format(masked: string): string {
    if (!masked) return '';
    const n = parseMoney(masked);
    return n ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  }

  useEffect(() => {
    if (!focused && value !== lastEmitted.current) {
      setDisplay(format(value));
      lastEmitted.current = value;
    }
    if (!focused && value === '' && display !== '') {
      setDisplay('');
    }
    if (!focused && value === '' ) setDisplay('');
  }, [value, focused]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      lastEmitted.current = '';
      setDisplay('');
      onChange('');
      return;
    }
    const n = Number(digits) / 100;
    const masked = String(n.toFixed(2)).replace('.', ',');
    setDisplay(n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    lastEmitted.current = masked;
    onChange(masked);
    if (!focused) setFocused(true);
  };

  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9a93a6', fontSize: 14, pointerEvents: 'none',
        }}
      >
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        id={id}
        required={required}
        value={display}
        placeholder={placeholder ?? '0,00'}
        onFocus={(e) => { setFocused(true); setTimeout(() => e.target.select(), 0); }}
        onBlur={() => { setFocused(false); setDisplay(format(value)); }}
        onChange={(e) => handleChange(e.target.value)}
        className={className}
        style={className ? undefined : { width: '100%', padding: '10px 12px', paddingLeft: 38, border: '1px solid #d4cde0', borderRadius: 9, fontSize: 14, color: '#2b2236', background: '#fff' }}
      />
    <span
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#2e7d4f', fontSize: 12, fontWeight: 600, pointerEvents: 'none', opacity: display ? 1 : 0,
        }}
      >
        {display ? parseMoney(display).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
      </span>
    </div>
  );
}
MoneyInput.parseMoney = parseMoney;
