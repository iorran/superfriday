'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserPreference, setUserPreference } from '@/lib/client/api'
import type { TourStep } from '@/components/Tour'

const TOUR_VERSION = '1.0' // Increment this to show tour again to existing users
const TOUR_COMPLETED_KEY = 'invoice-manager-tour-completed' // Fallback localStorage key

// Fallback to localStorage if API fails
const getLocalStorageTourStatus = () => {
  if (typeof window === 'undefined') return { completed: false, version: null }
  const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === 'true'
  const version = localStorage.getItem(`${TOUR_COMPLETED_KEY}-version`)
  return { completed, version }
}

const setLocalStorageTourStatus = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
  localStorage.setItem(`${TOUR_COMPLETED_KEY}-version`, TOUR_VERSION)
}

export const useTour = () => {
  const [showTour, setShowTour] = useState(false)
  const queryClient = useQueryClient()

  // Fetch tour completion status from database
  const { data: tourCompleted, isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['user-preference', 'tour_completed'],
    queryFn: async () => {
      try {
        return await getUserPreference('tour_completed')
      } catch {
        // Fallback to localStorage if API fails
        const local = getLocalStorageTourStatus()
        return local.completed
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const { data: tourVersion } = useQuery({
    queryKey: ['user-preference', 'tour_version'],
    queryFn: async () => {
      try {
        return await getUserPreference('tour_version')
      } catch {
        // Fallback to localStorage if API fails
        const local = getLocalStorageTourStatus()
        return local.version
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Mutation to save tour completion
  const saveTourCompletion = useMutation({
    mutationFn: async () => {
      try {
        await setUserPreference('tour_completed', true)
        await setUserPreference('tour_version', TOUR_VERSION)
      } catch (error) {
        // Fallback to localStorage if API fails
        setLocalStorageTourStatus()
        throw error // Still throw to trigger onError
      }
    },
    onSuccess: () => {
      // Update cache
      queryClient.setQueryData(['user-preference', 'tour_completed'], true)
      queryClient.setQueryData(['user-preference', 'tour_version'], TOUR_VERSION)
      // Also update localStorage as backup
      setLocalStorageTourStatus()
      setShowTour(false)
    },
    onError: (error) => {
      console.error('Error saving tour completion:', error)
      // Still hide tour even if save fails (localStorage fallback was used)
      setShowTour(false)
    },
  })

  useEffect(() => {
    // Wait for preferences to load
    if (isLoadingCompleted) return

    // Use database values if available, otherwise fallback to localStorage
    const completed = tourCompleted ?? getLocalStorageTourStatus().completed
    const version = tourVersion ?? getLocalStorageTourStatus().version

    // Show tour if not completed or if version changed
    const shouldShowTour = !completed || version !== TOUR_VERSION
    
    if (shouldShowTour) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        setShowTour(true)
      }, 1000)
    }
  }, [tourCompleted, tourVersion, isLoadingCompleted])

  const completeTour = () => {
    saveTourCompletion.mutate()
  }

  const skipTour = () => {
    saveTourCompletion.mutate()
  }

  const startTour = () => {
    setShowTour(true)
  }

  return {
    showTour,
    isLoading: isLoadingCompleted,
    completeTour,
    skipTour,
    startTour,
  }
}

export const tourSteps: TourStep[] = [
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Bem-vindo ao Gerenciador de Invoices! 🎉',
    description: 'Este é o menu de navegação. Aqui você pode acessar todas as seções principais do sistema.',
    position: 'right',
  },
  {
    id: 'invoices',
    target: 'nav-invoices',
    title: 'Invoices',
    description: 'Aqui você visualiza e gerencia todas as suas invoices. É a página principal do sistema.',
    position: 'right',
  },
  {
    id: 'finances',
    target: 'nav-finances',
    title: 'Análise Financeira',
    description: 'Acesse gráficos e análises detalhadas das suas finanças e invoices.',
    position: 'right',
  },
  {
    id: 'settings',
    target: 'nav-settings',
    title: 'Configurações',
    description: 'Configure templates de email, clientes e outras preferências do sistema.',
    position: 'right',
  },
  {
    id: 'upload-button',
    target: 'upload-button',
    title: 'Criar Nova Invoice',
    description: 'Clique aqui para fazer upload de uma nova invoice. Você pode adicionar arquivos PDF e o sistema extrairá automaticamente as informações.',
    position: 'left',
  },
  {
    id: 'main-content',
    target: 'main-content',
    title: 'Área Principal',
    description: 'Aqui você verá todas as suas invoices organizadas por cliente e ano. Você pode expandir cada grupo para ver os detalhes.',
    position: 'top',
    highlight: false,
  },
]

