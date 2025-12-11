'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TourStep {
  id: string
  target: string // CSS selector or data-tour attribute
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  highlight?: boolean
}

interface TourProps {
  steps: TourStep[]
  onComplete: () => void
  onSkip: () => void
}

export default function Tour({ steps, onComplete, onSkip }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({})
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({})
  const tooltipRef = useRef<HTMLDivElement>(null)

  const currentStepData = steps[currentStep]

  useEffect(() => {
    if (!currentStepData) return

    const findTarget = () => {
      // Try data-tour attribute first
      let element = document.querySelector(`[data-tour="${currentStepData.target}"]`) as HTMLElement
      
      // Fallback to CSS selector
      if (!element) {
        element = document.querySelector(currentStepData.target) as HTMLElement
      }

      return element
    }

    const updatePosition = () => {
      const element = findTarget()
      if (!element) {
        // If element not found, center the tooltip
        setTargetElement(null)
        setOverlayStyle({})
        setSpotlightStyle({})
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        })
        return
      }

      setTargetElement(element)
      const rect = element.getBoundingClientRect()
      const scrollX = window.scrollX || window.pageXOffset
      const scrollY = window.scrollY || window.pageYOffset

      // Calculate overlay (spotlight) position
      const overlayTop = rect.top + scrollY
      const overlayLeft = rect.left + scrollX
      const overlayWidth = rect.width
      const overlayHeight = rect.height

      setOverlayStyle({
        position: 'absolute',
        top: `${overlayTop}px`,
        left: `${overlayLeft}px`,
        width: `${overlayWidth}px`,
        height: `${overlayHeight}px`,
      })

      // Calculate spotlight mask position (for clip-path)
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const rectTop = rect.top
      const rectLeft = rect.left
      const rectRight = rect.right
      const rectBottom = rect.bottom

      // Create clip-path for spotlight effect
      const clipPath = `polygon(
        0% 0%,
        0% 100%,
        ${rectLeft}px 100%,
        ${rectLeft}px ${rectTop}px,
        ${rectRight}px ${rectTop}px,
        ${rectRight}px ${rectBottom}px,
        ${rectLeft}px ${rectBottom}px,
        ${rectLeft}px 100%,
        100% 100%,
        100% 0%
      )`

      setSpotlightStyle({
        clipPath,
      })

      // Calculate tooltip position
      const position = currentStepData.position || 'bottom'
      const spacing = 20
      let tooltipTop = 0
      let tooltipLeft = 0

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const tooltipWidth = tooltipRect.width
        const tooltipHeight = tooltipRect.height

        switch (position) {
          case 'top':
            tooltipTop = rect.top + scrollY - tooltipHeight - spacing
            tooltipLeft = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2
            break
          case 'bottom':
            tooltipTop = rect.bottom + scrollY + spacing
            tooltipLeft = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2
            break
          case 'left':
            tooltipTop = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2
            tooltipLeft = rect.left + scrollX - tooltipWidth - spacing
            break
          case 'right':
            tooltipTop = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2
            tooltipLeft = rect.right + scrollX + spacing
            break
          case 'center':
            tooltipTop = window.innerHeight / 2 + scrollY - tooltipHeight / 2
            tooltipLeft = window.innerWidth / 2 + scrollX - tooltipWidth / 2
            break
        }

        // Keep tooltip within viewport
        tooltipTop = Math.max(10, Math.min(tooltipTop, window.innerHeight + scrollY - tooltipHeight - 10))
        tooltipLeft = Math.max(10, Math.min(tooltipLeft, window.innerWidth + scrollX - tooltipWidth - 10))
      }

      setTooltipStyle({
        position: 'absolute',
        top: `${tooltipTop}px`,
        left: `${tooltipLeft}px`,
      })
    }

    // Initial positioning
    updatePosition()

    // Update on scroll/resize
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition)
    }

    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    // Scroll element into view if needed
    const element = findTarget()
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      // Wait for scroll to complete
      setTimeout(updatePosition, 500)
    }

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [currentStep, currentStepData])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1)
        } else {
          onComplete()
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentStep > 0) {
          setCurrentStep(currentStep - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentStep, steps.length, onComplete, onSkip])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  if (!currentStepData) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        {/* Dark overlay with spotlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={spotlightStyle}
        />

        {/* Highlighted element border */}
        {targetElement && currentStepData.highlight !== false && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring' }}
            className="absolute border-4 border-primary rounded-lg shadow-2xl pointer-events-none"
            style={{
              ...overlayStyle,
              boxShadow: '0 0 0 4px hsl(var(--primary)), 0 0 20px rgba(59, 130, 246, 0.5)',
            }}
          >
            {/* Pulsing animation */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 border-2 border-primary rounded-lg"
            />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.3, type: 'spring' }}
          className="pointer-events-auto"
          style={tooltipStyle}
        >
          <div className="bg-card border-2 border-primary rounded-lg shadow-2xl p-6 max-w-sm w-[320px] relative">
            {/* Decorative sparkle */}
            <div className="absolute -top-2 -right-2">
              <motion.div
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="h-6 w-6 text-primary" />
              </motion.div>
            </div>

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 p-1 hover:bg-accent rounded-md transition-colors"
              aria-label="Pular tour"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="pr-6">
              <h3 className="text-lg font-bold mb-2 text-foreground">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {currentStepData.description}
              </p>

              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-all',
                        index === currentStep
                          ? 'bg-primary'
                          : index < currentStep
                          ? 'bg-primary/50'
                          : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {currentStep + 1} de {steps.length}
                </p>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={cn('flex-1', currentStep === 0 && 'ml-auto')}
                >
                  {currentStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                  {currentStep < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

