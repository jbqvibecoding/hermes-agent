/**
 * Ported from errand/src/ui/components/Select.tsx (Apache-2.0, Runta),
 * unchanged apart from this header.
 *
 * A native `<select>` cannot carry an icon per option or flip open upwards when
 * it is near the bottom of the window, and both matter for the provider picker.
 * The menu renders in a portal so a dialog's `overflow: hidden` cannot clip it.
 */

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  action?: () => void;
}

export function Select({
  value, options, ariaLabel, placeholder = "Select", onChange, onOpen,
}: {
  value: string;
  options: SelectOption[];
  ariaLabel: string;
  placeholder?: string;
  onChange(value: string): void;
  onOpen?(): void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const position = () => {
      const bounds = root.current?.getBoundingClientRect();
      if (!bounds) return;
      const gap = 5;
      const margin = 8;
      const width = Math.max(bounds.width, 180);
      const desiredHeight = Math.min(220, options.length * 32 + 10);
      const roomBelow = window.innerHeight - bounds.bottom - margin;
      const openUp = roomBelow < desiredHeight && bounds.top - margin > roomBelow;
      setMenuStyle({
        position: "fixed",
        zIndex: 100,
        left: Math.max(margin, Math.min(bounds.right - width, window.innerWidth - width - margin)),
        top: openUp ? Math.max(margin, bounds.top - desiredHeight - gap) : bounds.bottom + gap,
        width,
        maxHeight: openUp ? Math.min(220, bounds.top - gap - margin) : Math.min(220, roomBelow),
      });
    };
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    position();
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", position);
    // Capture phase: a scroll inside any ancestor moves the trigger, and a
    // portalled menu does not move with it.
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, options.length]);

  const move = (direction: 1 | -1) => {
    const available = options.filter((option) => !option.disabled && !option.action);
    if (!available.length) return;
    const current = available.findIndex((option) => option.value === value);
    const next = current < 0
      ? (direction > 0 ? 0 : available.length - 1)
      : (current + direction + available.length) % available.length;
    onChange(available[next]!.value);
  };
  const toggle = () => setOpen((current) => { if (!current) onOpen?.(); return !current; });

  return <div className={`crew-select ${open ? "open" : ""}`} ref={root}>
    <button
      type="button"
      className="crew-select-trigger"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(false); return; }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          move(event.key === "ArrowDown" ? 1 : -1);
          if (!open) onOpen?.();
          setOpen(true);
        }
      }}
    >
      <span>{selected?.label ?? placeholder}</span>
      <span className="crew-select-chevron"><ChevronDown size={15} /></span>
    </button>
    {open && menuStyle && createPortal(
      <div
        className="crew-select-menu crew-select-menu-portal"
        ref={menu}
        style={menuStyle}
        role="listbox"
        aria-label={ariaLabel}
      >
        {options.map((option) => <button
          type="button"
          className={`${option.action ? "crew-select-action" : ""} ${option.action || option.icon ? "crew-select-has-icon" : ""}`}
          role="option"
          aria-selected={!option.action && option.value === value}
          disabled={option.disabled}
          key={option.value}
          onClick={() => {
            option.action?.();
            if (!option.action) onChange(option.value);
            setOpen(false);
          }}
        >
          {(option.action || option.icon) && <span className="crew-select-check" aria-hidden="true">{option.icon}</span>}
          <span className="crew-select-label" title={option.label}>{option.label}</span>
          {!option.action && <span className="crew-select-check" aria-hidden="true">
            {option.value === value && <Check size={14} />}
          </span>}
        </button>)}
      </div>,
      document.body,
    )}
  </div>;
}
