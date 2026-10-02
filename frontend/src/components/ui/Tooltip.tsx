import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent as ReactFocusEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useMotionReduced } from "../../contexts/UserPreferencesContext";


interface TooltipProps {
  label: string;
  content: string;
}

interface TooltipPosition {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

const Tooltip = ({ label, content }: TooltipProps) => {
  const shouldReduceMotion = useMotionReduced();
  const tooltipId = `metric-tooltip-${useId().replace(/:/g, "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ left: 8, top: 8, placement: "top" });

  const openTooltip = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsOpen(true);
  };

  const closeTooltip = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsOpen(false);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), 80);
  };

  const handleClick = () => {
    const isTouchLayout = window.matchMedia("(hover: none)").matches;

    if (isTouchLayout) {
      setIsOpen((current) => !current);

      return;
    }

    setIsOpen(true);
  };

  const handleFocus = (event: ReactFocusEvent<HTMLButtonElement>) => {
    if (event.currentTarget.matches(":focus-visible")) {
      openTooltip();
    }
  };

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) {
        return;
      }

      closeTooltip();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closeTooltip();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();

      if (!triggerRect || !tooltipRect) {
        return;
      }

      const gap = 8;
      const placement = triggerRect.top >= tooltipRect.height + gap + 8 ? "top" : "bottom";
      const centeredLeft = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      const left = Math.max(8, Math.min(centeredLeft, window.innerWidth - tooltipRect.width - 8));
      const top = placement === "top"
        ? triggerRect.top - tooltipRect.height - gap
        : triggerRect.bottom + gap;

      setPosition({ left, top, placement });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, content]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="tooltip-trigger"
        aria-label={`${label} 指標說明`}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleClose}
        onFocus={handleFocus}
        onBlur={scheduleClose}
        onClick={handleClick}
      >
        {label}
      </button>
      {createPortal(
        <motion.div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          aria-hidden={!isOpen}
          className="metric-tooltip"
          data-open={isOpen}
          data-placement={position.placement}
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0, y: isOpen || shouldReduceMotion ? 0 : 2 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{ left: position.left, top: position.top }}
          onMouseEnter={openTooltip}
          onMouseLeave={scheduleClose}
        >
          {content}
        </motion.div>,
        document.body
      )}
    </>
  );
};

export { Tooltip };