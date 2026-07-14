"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SelectOption = {
  value: string;
  label: string;
  color?: string;
};

export default function SearchSelect({
  options,
  value,
  onChange,
  name,
  placeholder = "Selecione",
  className,
  required,
  searchPlaceholder,
  defaultValue,
  onAddLabel,
  onAdd,
}: {
  options: SelectOption[];
  value?: string;
  onChange?: (v: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  searchPlaceholder?: string;
  defaultValue?: string;
  onAddLabel?: string;
  onAdd?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(value ?? defaultValue ?? "");
  const [prevValue, setPrevValue] = React.useState(value);
  const hiddenRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === selected);

  if (value !== undefined && value !== prevValue) {
    setPrevValue(value);
    setSelected(value);
  }

  const handleSelect = (v: string) => {
    setSelected(v);
    setOpen(false);
    onChange?.(v);
    if (hiddenRef.current) hiddenRef.current.value = v;
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          data-slot="search-select-trigger"
          className="flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-left outline-none transition-all hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {selectedOption?.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span
            className={cn(
              "flex-1 truncate",
              !selectedOption && "text-muted-foreground"
            )}
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 min-w-[var(--anchor-width,280px)]"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandInput
              placeholder={searchPlaceholder ?? "Buscar..."}
            />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">
                  Nenhum resultado.
                </span>
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.value}`}
                    onSelect={() => handleSelect(opt.value)}
                    data-checked={
                      opt.value === selected ? true : undefined
                    }
                  >
                    {opt.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span>{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {onAdd && (
                <>
                  <CommandSeparator />
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      onAdd();
                    }}
                  >
                    <Plus size={14} className="mr-1" />
                    <span>{onAddLabel ?? "Adicionar"}</span>
                  </CommandItem>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <input
        type="hidden"
        ref={hiddenRef}
        name={name}
        value={selected}
        required={required}
      />
    </div>
  );
}
