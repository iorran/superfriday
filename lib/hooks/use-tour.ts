'use client'

import { useState, useEffect } from 'react'
import type { TourStep } from '@/components/Tour'

const TOUR_COMPLETED_KEY = 'invoice-manager-tour-completed'
const TOUR_VERSION = '1.0' // Increment this to show tour again to existing users

export function useTour() {
  const [showTour, setShowTour] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if tour was completed
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY)
    const completedVersion = localStorage.getItem(`${TOUR_COMPLETED_KEY}-version`)
    
    // Show tour if not completed or if version changed
    if (!completed || completedVersion !== TOUR_VERSION) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        setShowTour(true)
        setIsLoading(false)
      }, 1000)
    } else {
      setIsLoading(false)
    }
  }, [])

  const completeTour = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
    localStorage.setItem(`${TOUR_COMPLETED_KEY}-version`, TOUR_VERSION)
    setShowTour(false)
  }

  const skipTour = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
    localStorage.setItem(`${TOUR_COMPLETED_KEY}-version`, TOUR_VERSION)
    setShowTour(false)
  }

  const startTour = () => {
    setShowTour(true)
  }

  return {
    showTour,
    isLoading,
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

