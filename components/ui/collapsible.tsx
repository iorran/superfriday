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
    // onOpenChange is already extracted, props doesn't contain it
    return (
      <div ref={ref} className={className} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Only pass onOpenChange to CollapsibleTrigger, not to CollapsibleContent
            // Check if it's a CollapsibleTrigger by checking displayName or component name
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const childType = child.type as React.ComponentType<any> & { displayName?: string; name?: string }
            const isTrigger = childType?.displayName === 'CollapsibleTrigger' || 
                             childType?.name === 'CollapsibleTrigger'
            const childProps = isTrigger 
              ? { open, onOpenChange }
              : { open }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return React.cloneElement(child, childProps as any)
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
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      // Always toggle - let parent handle the state
      onOpenChange?.(!open)
    }, [open, onOpenChange])
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full items-center justify-between p-4 text-left font-medium transition-all hover:bg-accent [&[data-state=open]>svg]:rotate-180",
          className
        )}
        onClick={handleClick}
        data-state={open ? "open" : "closed"}
        {...props}
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
    // Remove onOpenChange from props if it exists (shouldn't be passed, but just in case)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onOpenChange: _onOpenChange, ...restProps } = props as { onOpenChange?: (open: boolean) => void; [key: string]: unknown }
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          className
        )}
        data-state={open ? "open" : "closed"}
        {...restProps}
      >
        {open && children}
      </div>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
