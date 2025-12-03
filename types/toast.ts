/**
 * Toast types
 */

import * as React from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  action?: React.ReactNode
}

export interface ToastState {
  toasts: Toast[]
}

export type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'UPDATE_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string }

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

