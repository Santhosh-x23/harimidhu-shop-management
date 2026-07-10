import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from './Layout'

const PrivateRoute = () => {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    // Show loading state while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  
  // Wrap authenticated routes with Layout
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default PrivateRoute 