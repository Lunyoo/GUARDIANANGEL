import { useState } from 'react'

function App() {
  const [teste] = useState('Funcionando!')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontSize: '24px'
    }}>
      <h1>🎮 NEXUS Gaming Intelligence</h1>
      <p>{teste}</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          style={{
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
          onClick={() => alert('Sistema funcionando!')}
        >
          Testar Funcionalidade
        </button>
      </div>
    </div>
  )
}

export default App
