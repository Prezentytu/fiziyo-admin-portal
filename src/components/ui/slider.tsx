"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [50], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const currentValue = value[0] ?? 50
    const percentage = ((currentValue - min) / (max - min)) * 100

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      onValueChange?.([newValue])
    }

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-light">
          <div
            className="absolute h-full bg-primary rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          {...props}
        />
        <div
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 pointer-events-none"
          style={{
            left: `calc(${percentage}% - 10px)`,
          }}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }





