import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMotionReduced } from "../../contexts/UserPreferencesContext";


export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  opensUp: boolean;
}

const Select = ({ label, value, options, onChange, disabled = false, className = "" }: SelectProps) => {
  const shouldReduceMotion = useMotionReduced();
  const generatedId = useId().replace(/:/g, "");
  const listboxId = `select-listbox-${generatedId}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const activeOption = options[activeIndex];

  const findEnabledIndex = (start: number, direction: 1 | -1): number => {
    for (let index = start; index >= 0 && index < options.length; index += direction) {
      if (!options[index]?.disabled) {
        return index;
      }
    }

    return -1;
  };

  const openMenu = (direction: 1 | -1 = 1) => {
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    const startIndex = selectedIndex >= 0 ? selectedIndex : direction === 1 ? 0 : options.length - 1;
    setActiveIndex(findEnabledIndex(startIndex, direction));
    setIsOpen(true);
  };

  const closeMenu = (restoreFocus: boolean) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const selectOption = (option: SelectOption) => {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
    closeMenu(true);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        openMenu(event.key === "ArrowUp" ? -1 : 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        openMenu();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);

      return;
    }

    if (event.key === "Tab") {
      closeMenu(false);

      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = findEnabledIndex(activeIndex + direction, direction);

      if (nextIndex >= 0) {
        setActiveIndex(nextIndex);
      }

      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();

      const start = event.key === "Home" ? 0 : options.length - 1;
      const direction = event.key === "Home" ? 1 : -1;

      setActiveIndex(findEnabledIndex(start, direction));

      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      const option = options[activeIndex];

      if (option) {
        selectOption(option);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (triggerRef.current?.contains(target) || listboxRef.current?.contains(target)) {
        return;
      }

      closeMenu(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;

      }

      const rect = trigger.getBoundingClientRect();
      const edgeGap = 8;
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - edgeGap * 2);
      const availableAbove = Math.max(0, rect.top - edgeGap * 2);
      const desiredHeight = Math.min(320, Math.max(80, options.length * 44 + 24));
      const opensUp = availableBelow < Math.min(desiredHeight, 240) && availableAbove > availableBelow;
      const availableHeight = opensUp ? availableAbove : availableBelow;
      const maxHeight = Math.max(80, Math.min(desiredHeight, availableHeight));
      const width = Math.min(rect.width, window.innerWidth - edgeGap * 2);
      const left = Math.max(edgeGap, Math.min(rect.left, window.innerWidth - width - edgeGap));
      const top = opensUp
        ? Math.max(edgeGap, rect.top - maxHeight - edgeGap)
        : Math.min(rect.bottom + edgeGap, window.innerHeight - maxHeight - edgeGap);

      setPosition({ left, top, width, maxHeight, opensUp });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }

    listboxRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, position]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`select-trigger${isOpen ? " is-open" : ""} ${className}`.trim()}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && activeOption ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => isOpen ? closeMenu(false) : openMenu()}
        onKeyDown={handleKeyDown}
      >
        <span className="select-trigger-label">{selectedOption?.label ?? (value || "尚無選項")}</span>
        <svg className="select-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7 5 5 5-5" />
        </svg>
      </button>
      {createPortal(
        <AnimatePresence>
          {isOpen && position ? (
            <motion.div
              className="select-listbox"
              initial={shouldReduceMotion ? false : { opacity: 0, y: position.opensUp ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : position.opensUp ? 2 : -2 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                maxHeight: position.maxHeight
              }}
            >
              <div
                ref={listboxRef}
                id={listboxId}
                className="select-listbox-scroll"
                role="listbox"
                aria-label={label}
                aria-hidden={!isOpen}
                inert={!isOpen}
                style={{ maxHeight: Math.max(44, position.maxHeight - 18) }}
              >
                {options.map((option, index) => (
                  <div
                    id={`${listboxId}-option-${index}`}
                    key={`${option.value}-${index}`}
                    data-option-index={index}
                    className={`select-option${value === option.value ? " is-selected" : ""}${activeIndex === index ? " is-active" : ""}`}
                    role="option"
                    aria-selected={value === option.value}
                    aria-disabled={option.disabled || undefined}
                    onPointerMove={() => !option.disabled && setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                  >
                    <span>{option.label}</span>
                    {value === option.value ? <span className="select-option-check" aria-hidden="true">✓</span> : null}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export { Select };