import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export interface DateFilterConfig {
  dateField: 'data_criacao' | 'updated_at' | 'prazo_interno';
  from?: Date;
  to?: Date;
  preset?: string;
}

interface DateFilterProps {
  value: DateFilterConfig;
  onChange: (config: DateFilterConfig) => void;
  className?: string;
}

const DATE_PRESETS = [
  { key: 'today', label: 'Hoje', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { key: 'yesterday', label: 'Ontem', getValue: () => {
    const yesterday = subDays(new Date(), 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
  }},
  { key: 'last_7d', label: 'Últimos 7 dias', getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { key: 'last_30d', label: 'Últimos 30 dias', getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { key: 'this_month', label: 'Este mês', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { key: 'last_month', label: 'Mês passado', getValue: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }},
  { key: 'all', label: 'Tudo', getValue: () => ({ from: undefined, to: undefined }) }
];

const DATE_FIELD_LABELS = {
  'data_criacao': 'Data de criação',
  'updated_at': 'Última atualização',
  'prazo_interno': 'Vencimento / SLA'
};

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);
  const [selectedPreset, setSelectedPreset] = useState<string>(value.preset || 'all');

  useEffect(() => {
    setCustomFrom(value.from);
    setCustomTo(value.to);
    setSelectedPreset(value.preset || 'all');
  }, [value]);

  const getActiveFilterLabel = () => {
    if (!value.from && !value.to) return null;
    
    if (value.preset && value.preset !== 'custom') {
      const preset = DATE_PRESETS.find(p => p.key === value.preset);
      return preset?.label;
    }
    
    if (value.from && value.to) {
      return `${format(value.from, 'dd/MM/yyyy')} - ${format(value.to, 'dd/MM/yyyy')}`;
    }
    
    if (value.from) {
      return `A partir de ${format(value.from, 'dd/MM/yyyy')}`;
    }
    
    if (value.to) {
      return `Até ${format(value.to, 'dd/MM/yyyy')}`;
    }
    
    return null;
  };

  const handlePresetSelect = (presetKey: string) => {
    const preset = DATE_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    
    const dateRange = preset.getValue();
    setSelectedPreset(presetKey);
    setCustomFrom(dateRange.from);
    setCustomTo(dateRange.to);
    
    onChange({
      ...value,
      from: dateRange.from,
      to: dateRange.to,
      preset: presetKey
    });
    
    if (presetKey !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleCustomDateChange = () => {
    onChange({
      ...value,
      from: customFrom,
      to: customTo,
      preset: 'custom'
    });
    setSelectedPreset('custom');
    setIsOpen(false);
  };

  const handleDateFieldChange = (field: DateFilterConfig['dateField']) => {
    onChange({
      ...value,
      dateField: field
    });
  };

  const clearFilter = () => {
    onChange({
      ...value,
      from: undefined,
      to: undefined,
      preset: 'all'
    });
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setSelectedPreset('all');
  };

  const activeFilterLabel = getActiveFilterLabel();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Active filter chip */}
      {activeFilterLabel && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {activeFilterLabel}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={clearFilter}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {/* Date filter button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Período
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Date field selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Campo de data</label>
              <Select value={value.dateField} onValueChange={handleDateFieldChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATE_FIELD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Quick presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Períodos rápidos</label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    variant={selectedPreset === preset.key ? "default" : "outline"}
                    size="sm"
                    className="justify-start text-xs"
                    onClick={() => handlePresetSelect(preset.key)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  variant={selectedPreset === 'custom' ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-xs col-span-2"
                  onClick={() => {
                    setSelectedPreset('custom');
                  }}
                >
                  Personalizado
                </Button>
              </div>
            </div>

            {/* Custom date range */}
            {selectedPreset === 'custom' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <label className="text-sm font-medium">Intervalo personalizado</label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">De</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customFrom && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customFrom ? format(customFrom, "dd/MM/yyyy") : "Início"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customFrom}
                            onSelect={setCustomFrom}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Até</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customTo && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customTo ? format(customTo, "dd/MM/yyyy") : "Fim"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customTo}
                            onSelect={setCustomTo}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {customFrom && customTo && (
                    <div className="text-xs text-muted-foreground">
                      {format(customFrom, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} até{" "}
                      {format(customTo, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  )}

                  <Button 
                    onClick={handleCustomDateChange}
                    className="w-full"
                    disabled={!customFrom && !customTo}
                  >
                    Aplicar período personalizado
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}