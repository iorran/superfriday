'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserPreference, setUserPreference } from '@/lib/client/api'
import type { TourStep } from '@/components/Tour'

const TOUR_VERSION = '1.0' // Increment this to show tour again to existing users

export const useTour = () => {
  const [showTour, setShowTour] = useState(false)
  const queryClient = useQueryClient()

  // Fetch tour completion status from database
  const { data: tourCompleted, isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['user-preference', 'tour_completed'],
    queryFn: async () => {
      try {
        const value = await getUserPreference('tour_completed')
        // Ensure we always return a boolean, never undefined
        return value === true || value === 'true'
      } catch {
        // If API fails, default to false (show tour)
        return false
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const { data: tourVersion } = useQuery({
    queryKey: ['user-preference', 'tour_version'],
    queryFn: async () => {
      try {
        const value = await getUserPreference('tour_version')
        // Ensure we always return a string or null, never undefined
        return value ?? null
      } catch {
        // If API fails, default to null (show tour)
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Mutation to save tour completion
  const saveTourCompletion = useMutation({
    mutationFn: async () => {
      await setUserPreference('tour_completed', true)
      await setUserPreference('tour_version', TOUR_VERSION)
    },
    onSuccess: () => {
      // Update cache
      queryClient.setQueryData(['user-preference', 'tour_completed'], true)
      queryClient.setQueryData(['user-preference', 'tour_version'], TOUR_VERSION)
      setShowTour(false)
    },
    onError: (error) => {
      console.error('Error saving tour completion:', error)
      // Still hide tour even if save fails
      setShowTour(false)
    },
  })

  useEffect(() => {
    // Wait for preferences to load
    if (isLoadingCompleted) return

    // Use database values
    const completed = tourCompleted ?? false
    const version = tourVersion ?? null

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
