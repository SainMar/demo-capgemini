import { useState } from 'react'
import './index.css'
import { ManagerDashboard } from './components/ManagerDashboard'
import { TeamTodo } from './components/TeamTodo'
import type { View } from './components/ViewToggle'

function App() {
  const [view, setView] = useState<View>('team')
  const [, setVersion] = useState(0)

  const bump = () => setVersion((v) => v + 1)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {view === 'team' ? (
        <TeamTodo view={view} onViewChange={setView} bump={bump} />
      ) : (
        <ManagerDashboard view={view} onViewChange={setView} />
      )}
    </div>
  )
}

export default App
