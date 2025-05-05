import * as React from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "$0.00",
  className,
  disabled,
  ...props
}: CurrencyInputProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-numeric characters except for decimal point
    const cleanedValue = e.target.value.replace(/[^\d.]/g, "");
    
    // Parse to number and validate
    const numericValue = parseFloat(cleanedValue);
    
    // If valid number, call onChange, otherwise use 0
    onChange(isNaN(numericValue) ? 0 : numericValue);
  };
  
  // Format the value as currency
  const formattedValue = typeof value === 'number' ? value.toFixed(2) : '0.00';
  
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">$</span>
      </div>
      <Input
        type="text"
        className={`pl-7 ${className}`}
        placeholder={placeholder}
        value={formattedValue}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
