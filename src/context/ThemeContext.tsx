import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'light' | 'dark'

interface ThemeState {
  tema: Tema
  alternarTema: () => void
}

const ThemeContext = createContext<ThemeState>({ tema: 'light', alternarTema: () => {} })

function lerTemaSalvo(): Tema {
  if (typeof window === 'undefined') return 'light'
  return window.localStorage.getItem('tema') === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    window.localStorage.setItem('tema', tema)
  }, [tema])

  function alternarTema() {
    setTema((atual) => (atual === 'dark' ? 'light' : 'dark'))
  }

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
