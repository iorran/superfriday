'use client'

import UserInfoSettings from '@/components/UserInfoSettings'

const UserInfoPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Informações da Empresa</h1>
        <p className="text-muted-foreground">
          Configure as informações da sua empresa que serão usadas na geração de invoices
        </p>
      </div>

      <UserInfoSettings />
    </div>
  )
}

export default UserInfoPage
