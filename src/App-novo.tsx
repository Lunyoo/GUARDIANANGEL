function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{ 
          fontSize: '48px', 
          textAlign: 'center',
          background: 'linear-gradient(45deg, #00f5ff, #0070f3, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '30px'
        }}>
          🎮 NEXUS Gaming Intelligence
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '40px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#00f5ff', marginBottom: '15px' }}>✅ Frontend Online</h3>
            <p>Sistema React funcionando corretamente!</p>
            <button 
              style={{
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
              onClick={() => alert('Frontend 100% funcional!')}
            >
              ✅ Testar
            </button>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ffa500', marginBottom: '15px' }}>⚙️ Próximo: Backend</h3>
            <p>Vamos conectar os serviços backend</p>
            <button 
              style={{
                backgroundColor: '#ffa500',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
              onClick={() => alert('Vamos iniciar o backend Node.js!')}
            >
              🚀 Iniciar Backend
            </button>
          </div>
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '40px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <p>🎮 Sistema de Marketing Digital com IA • Solo Leveling Style</p>
        </div>
      </div>
    </div>
  )
}

export default App
