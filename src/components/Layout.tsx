import { ReactNode } from 'react'


type LayoutProps = {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}

export default Layout 