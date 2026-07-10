import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

type AuthContextType = {
  currentUser: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    if (email !== 'harimidhuorganic@gmail.com') {
      throw new Error('Only harimidhuorganic@gmail.com is allowed to login')
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('Login successful!')
      navigate('/')
    } catch (error: any) {
      console.error(error)
      throw new Error(error.message || 'Failed to login')
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to logout')
    }
  }

  const value = {
    currentUser,
    login,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 