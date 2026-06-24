"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, DateObject } from "react-multi-date-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";

function toIsoDate(value: DateObject | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : value.toDate?.();
  if (!date || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromIsoDate(value: string): Date | null {
  if (!value.trim()) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPickerValue(dateFrom: string, dateTo: string): DateObject[] | undefined {
  const from = fromIsoDate(dateFrom);
  const to = fromIsoDate(dateTo);
  if (!from && !to) return undefined;
  const dates: DateObject[] = [];
  if (from) dates.push(new DateObject(from));
  if (to) dates.push(new DateObject(to));
  return dates;
}

function initialVisibleMonths(range?: DateObject[]): {
  left: DateObject;
  right: DateObject;
} {
  const today = new DateObject();
  if (!range?.length) {
    return {
      left: today,
      right: new DateObject(today).add(1, "month"),
    };
  }
  const left = new DateObject(range[0]);
  if (range.length > 1) {
    const right = new DateObject(range[range.length - 1]);
    if (right.toFirstOfMonth().valueOf() <= left.toFirstOfMonth().valueOf()) {
      return { left, right: new DateObject(left).add(1, "month") };
    }
    return { left, right };
  }
  return { left, right: new DateObject(left).add(1, "month") };
}

function formatRangeLabel(dateFrom: string, dateTo: string, compact = false): string {
  const format = (iso: string) => {
    const date = fromIsoDate(iso);
    if (!date) return "";
    if (compact) {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const from = format(dateFrom);
  const to = format(dateTo);
  if (from && to) return `${from} – ${to}`;
  if (from) return `${from} – …`;
  return "";
}

function commitRange(
  dates: DateObject[],
  onChange: (dateFrom: string, dateTo: string) => void
): { dateFrom: string; dateTo: string } {
  const sorted = [...dates].sort((a, b) => a.toDate().getTime() - b.toDate().getTime());
  const dateFrom = toIsoDate(sorted[0]);
  const dateTo = toIsoDate(sorted[sorted.length - 1]);
  onChange(dateFrom, dateTo);
  return { dateFrom, dateTo };
}

export function PolicyDateRangeFilter({
  className,
  dateFrom,
  dateTo,
  onChange,
}: {
  className?: string;
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}) {
  const committedRef = useRef({ dateFrom, dateTo });
  const pickerRangeRef = useRef<DateObject[] | undefined>(undefined);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [pickerRange, setPickerRange] = useState<DateObject[] | undefined>(() =>
    toPickerValue(dateFrom, dateTo)
  );
  const [leftMonth, setLeftMonth] = useState(() => initialVisibleMonths().left);
  const [rightMonth, setRightMonth] = useState(() => initialVisibleMonths().right);

  pickerRangeRef.current = pickerRange;

  useEffect(() => {
    if (
      dateFrom === committedRef.current.dateFrom &&
      dateTo === committedRef.current.dateTo
    ) {
      return;
    }
    committedRef.current = { dateFrom, dateTo };
    setPickerRange(toPickerValue(dateFrom, dateTo));
  }, [dateFrom, dateTo]);

  const computePanelPosition = useCallback((): { top: number; left: number } | null => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return null;

    const rect = anchor.getBoundingClientRect();
    const padding = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    if (!panelWidth || !panelHeight) return null;

    let left = rect.right - panelWidth;
    left = Math.max(padding, Math.min(left, viewportW - panelWidth - padding));

    let top = rect.bottom + 4;
    if (top + panelHeight > viewportH - padding) {
      const above = rect.top - panelHeight - 4;
      if (above >= padding) top = above;
    }

    return { top, left };
  }, []);

  const placePanel = useCallback(() => {
    const pos = computePanelPosition();
    if (pos) {
      setPanelPos(pos);
      return true;
    }
    return false;
  }, [computePanelPosition]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }

    let attempts = 0;
    let rafId = 0;

    const tryPlace = () => {
      if (placePanel()) return;
      if (attempts < 6) {
        attempts += 1;
        rafId = requestAnimationFrame(tryPlace);
      }
    };

    tryPlace();

    return () => cancelAnimationFrame(rafId);
  }, [open, placePanel, leftMonth, rightMonth]);

  useEffect(() => {
    if (!open || !panelRef.current) return;

    const observer = new ResizeObserver(() => {
      placePanel();
    });
    observer.observe(panelRef.current);

    return () => observer.disconnect();
  }, [open, placePanel]);

  const openPanel = useCallback(() => {
    const months = initialVisibleMonths(pickerRangeRef.current);
    setLeftMonth(months.left);
    setRightMonth(months.right);
    setPanelPos(null);
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    const current = pickerRangeRef.current;
    if (current?.length === 1) {
      const hadCommittedRange = Boolean(
        committedRef.current.dateFrom || committedRef.current.dateTo
      );
      if (!hadCommittedRange) {
        const day = toIsoDate(current[0]);
        committedRef.current = { dateFrom: day, dateTo: day };
        onChange(day, day);
        setPickerRange([current[0], new DateObject(current[0])]);
      } else {
        setPickerRange(
          toPickerValue(committedRef.current.dateFrom, committedRef.current.dateTo)
        );
      }
    } else if (current && current.length >= 2) {
      const committed = commitRange(current, onChange);
      committedRef.current = committed;
      setPickerRange(toPickerValue(committed.dateFrom, committed.dateTo));
    }
    setOpen(false);
    setPanelPos(null);
  }, [onChange]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      closePanel();
    };

    const onReposition = () => placePanel();

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, closePanel, placePanel]);

  const handleRangeChange = (dates: DateObject[] | null) => {
    if (!dates || dates.length === 0) {
      setPickerRange(undefined);
      committedRef.current = { dateFrom: "", dateTo: "" };
      onChange("", "");
      return;
    }

    setPickerRange(dates);

    if (dates.length >= 2) {
      committedRef.current = commitRange(dates, onChange);
    }
  };

  const displayLabel = useMemo(() => {
    if (pickerRange?.length) {
      const from = toIsoDate(pickerRange[0]);
      const to =
        pickerRange.length > 1 ? toIsoDate(pickerRange[pickerRange.length - 1]) : "";
      return formatRangeLabel(from, to, true);
    }
    return formatRangeLabel(dateFrom, dateTo, true);
  }, [pickerRange, dateFrom, dateTo]);

  const displayTitle = useMemo(() => {
    if (pickerRange?.length) {
      const from = toIsoDate(pickerRange[0]);
      const to =
        pickerRange.length > 1 ? toIsoDate(pickerRange[pickerRange.length - 1]) : "";
      return formatRangeLabel(from, to) || undefined;
    }
    return formatRangeLabel(dateFrom, dateTo) || undefined;
  }, [pickerRange, dateFrom, dateTo]);

  const hasValue = Boolean(dateFrom || dateTo || pickerRange?.length);

  const calendarPanel =
    open &&
    createPortal(
      <div
        ref={panelRef}
        className="rmdp-wrapper rmdp-shadow max-w-[calc(100vw-24px)]"
        style={{
          position: "fixed",
          top: panelPos?.top ?? -10000,
          left: panelPos?.left ?? 0,
          visibility: panelPos ? "visible" : "hidden",
          pointerEvents: panelPos ? "auto" : "none",
          zIndex: 2000,
        }}
        role="dialog"
        aria-label="Choose date range"
      >
        <div className="flex max-w-full flex-col sm:flex-row">
          <Calendar
            range
            rangeHover
            numberOfMonths={1}
            currentDate={leftMonth}
            onMonthChange={setLeftMonth}
            onYearChange={setLeftMonth}
            value={pickerRange}
            onChange={handleRangeChange}
          />
          <Calendar
            range
            rangeHover
            numberOfMonths={1}
            currentDate={rightMonth}
            onMonthChange={setRightMonth}
            onYearChange={setRightMonth}
            value={pickerRange}
            onChange={handleRangeChange}
          />
        </div>
      </div>,
      document.body
    );

  return (
    <div className={`flex min-w-0 max-w-full flex-col gap-1 overflow-hidden text-sm text-gray-700 ${className ?? ""}`}>
      <span className="truncate text-xs font-medium uppercase text-gray-500">Date range</span>
      <div ref={anchorRef} className="relative min-w-0 w-full overflow-hidden">
        <CalendarIcon
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => (open ? closePanel() : openPanel())}
          className="flex h-[38px] w-full min-w-0 items-center overflow-hidden rounded-md border border-gray-300 bg-white py-2 pl-9 pr-8 text-left text-sm text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by date range"
          aria-expanded={open}
          title={displayTitle}
        >
          <span className={`block min-w-0 truncate ${displayLabel ? "text-gray-900" : "text-gray-400"}`}>
            {displayLabel || "Date range"}
          </span>
        </button>
        {hasValue ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPickerRange(undefined);
              committedRef.current = { dateFrom: "", dateTo: "" };
              onChange("", "");
              setOpen(false);
              setPanelPos(null);
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Clear date range"
            title={displayLabel || "Clear date range"}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        {calendarPanel}
      </div>
    </div>
  );
}
