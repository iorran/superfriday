'use client'

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open, onOpenChange, children, className, ...props }, ref) => {
    // Filter out onOpenChange from props to avoid passing it to DOM
    const { onOpenChange: _, ...domProps } = props as any
    
    return (
      <div ref={ref} className={className} {...domProps}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { open, onOpenChange } as any)
          }
          return child
        })}
      </div>
    )
  }
)
Collapsible.displayName = "Collapsible"

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ 
    className, 
    children, 
    open, 
    onOpenChange,
    ...props 
  }, ref) => {
    // Filter out onOpenChange from props to avoid passing it to DOM
    const { onOpenChange: _, ...domProps } = props as any
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full items-center justify-between p-4 text-left font-medium transition-all hover:bg-accent [&[data-state=open]>svg]:rotate-180",
          className
        )}
        onClick={() => onOpenChange?.(!open)}
        data-state={open ? "open" : "closed"}
        {...domProps}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

interface CollapsibleContentProps {
  className?: string
  children: React.ReactNode
  open?: boolean
}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ 
    className, 
    children, 
    open,
    ...props 
  }, ref) => {
    // Filter out onOpenChange if it exists in props
    const { onOpenChange: _, ...domProps } = props as any
    
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          className
        )}
        data-state={open ? "open" : "closed"}
        {...domProps}
      >
        {open && children}
      </div>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
