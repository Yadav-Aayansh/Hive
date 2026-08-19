import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DEFAULT_TIME = "18:00";

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return { value, label: format(parse(value, "HH:mm", new Date()), "h:mm a") };
});

function split(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function join(date: string, time: string): string {
  return date === "" ? "" : `${date}T${time === "" ? DEFAULT_TIME : time}`;
}

function Calendar({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="w-64">
      <div className="flex items-center justify-between gap-2 pb-2">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Previous month"
          onClick={() => setMonth((current) => addMonths(current, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="font-heading text-sm font-semibold">
          {format(month, "MMMM yyyy")}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Next month"
          onClick={() => setMonth((current) => addMonths(current, 1))}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      <div role="row" className="grid grid-cols-7 gap-0.5 pb-1">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            role="columnheader"
            className="py-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {day}
          </span>
        ))}
      </div>

      <div role="grid" aria-label="Choose a date" className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const active = selected !== null && isSameDay(day, selected);
          const outside = !isSameMonth(day, month);

          return (
            <PopoverClose
              key={day.toISOString()}
              render={
                <button
                  type="button"
                  role="gridcell"
                  aria-selected={active}
                  aria-label={format(day, "EEEE d MMMM yyyy")}
                  onClick={() => onSelect(day)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    outside && "text-muted-foreground/45",
                    !active && "hover:bg-accent",
                    isToday(day) && !active && "ring-1 ring-primary/50",
                    active && "bg-primary font-semibold text-primary-foreground",
                  )}
                />
              }
            >
              {format(day, "d")}
            </PopoverClose>
          );
        })}
      </div>
    </div>
  );
}

export function DateField({
  id,
  value,
  onChange,
  placeholder = "Any date",
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const selected = value === "" ? null : parse(value, "yyyy-MM-dd", new Date());

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 font-normal sm:w-40"
            />
          }
        >
          <CalendarIcon className="text-muted-foreground" />
          {selected ? (
            format(selected, "d MMM yyyy")
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={selected}
            onSelect={(next) => onChange(format(next, "yyyy-MM-dd"))}
          />
        </PopoverContent>
      </Popover>

      {value === "" ? null : (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Clear"
          onClick={() => onChange("")}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}

export function DateTimeField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { date, time } = split(value);
  const selected = date === "" ? null : parse(date, "yyyy-MM-dd", new Date());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className="flex-1 justify-start gap-2 font-normal"
            />
          }
        >
          <CalendarIcon className="text-muted-foreground" />
          {selected ? (
            format(selected, "EEE d MMM yyyy")
          ) : (
            <span className="text-muted-foreground">Pick a date</span>
          )}
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={selected}
            onSelect={(next) => onChange(join(format(next, "yyyy-MM-dd"), time))}
          />
        </PopoverContent>
      </Popover>

      <Select
        items={TIME_OPTIONS}
        value={time === "" ? DEFAULT_TIME : time}
        disabled={disabled || date === ""}
        onValueChange={(next) => onChange(join(date, String(next)))}
      >
        <SelectTrigger className="w-32" aria-label="Time">
          <ClockIcon className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {date === "" || disabled ? null : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Clear date"
          onClick={() => onChange("")}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
