'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepChange?: (step: number) => void
  className?: string
}

export function Stepper({ steps, currentStep, onStepChange, className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Circles and Connector Lines Row */}
      <div className="flex items-center relative">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          const isClickable = onStepChange && (isCompleted || isActive)
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1 relative z-10">
                <button
                  type="button"
                  onClick={() => isClickable && onStepChange?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 shrink-0',
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary border-primary text-primary-foreground scale-110'
                      : 'bg-background border-muted-foreground/30 text-muted-foreground',
                    isClickable && 'cursor-pointer hover:scale-105',
                    !isClickable && 'cursor-not-allowed'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Check className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-semibold"
                      >
                        {step.id}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 relative -mx-2 z-0">
                  <div className="absolute inset-0 bg-muted-foreground/20" />
                  <motion.div
                    className="absolute inset-0 bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: isCompleted ? 1 : currentStep > step.id ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Labels Row */}
      <div className="flex items-start mt-2">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 min-w-0 px-1">
              <p
                className={cn(
                  'text-sm font-medium transition-colors text-center',
                  isActive || isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p
                  className={cn(
                    'text-xs mt-1 transition-colors text-center',
                    isActive || isCompleted
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/60'
                  )}
                >
                  {step.description}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface StepContentProps {
  step: number
  currentStep: number
  children: React.ReactNode
  className?: string
}

export function StepContent({ step, currentStep, children, className }: StepContentProps) {
  const isActive = step === currentStep

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

