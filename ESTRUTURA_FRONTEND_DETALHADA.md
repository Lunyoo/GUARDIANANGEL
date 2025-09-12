# 📁 ESTRUTURA DETALHADA - COMPONENTES FRONTEND

> **Detalhamento completo dos componentes React do GUARDIANANGEL**

## 🎨 **COMPONENTES UI E LAYOUTS**

### **📊 Analytics & Dashboards**

#### `AnaliseComparativa.tsx`
- **Função**: Análise comparativa de performance entre campanhas
- **Features**: Gráficos de comparação, métricas side-by-side, insights automáticos
- **Integração**: Analytics API + Facebook Insights

#### `AutomacaoHistorico.tsx`
- **Função**: Histórico completo de automações executadas
- **Features**: Timeline de automações, filtros por período, status tracking
- **Integração**: ML Decision Logger + Auto Optimizer

#### `BudgetAllocatorPanel.tsx`
- **Função**: Painel de controle do alocador inteligente de budget
- **Features**: Alocação em tempo real, aprovações pendentes, ROI predictions
- **Integração**: Budget Allocator ML + Approval System

#### `CommandCenter.tsx`
- **Função**: Centro de comando principal do sistema
- **Features**: Overview geral, quick actions, status de todos serviços
- **Integração**: Neural Orchestrator + System Health

#### `DashboardML.tsx`
- **Função**: Dashboard específico para métricas de Machine Learning
- **Features**: Universal Bandits stats, model performance, A/B tests
- **Integração**: ML Services + Universal Bandits

---

### **🎯 Campanhas & Marketing**

#### `CampaignLinksGenerator.tsx`
- **Função**: Gerador automático de links de campanha
- **Features**: UTM parameters, link shortening, QR codes
- **Integração**: Campaign API + Tracking Service

#### `CampanhasCriativosTab.tsx`
- **Função**: Tab de gerenciamento de criativos de campanhas
- **Features**: Upload de criativos, preview, performance por criativo
- **Integração**: Facebook Creative API + Media Service

#### `GeradorCriativoIA.tsx`
- **Função**: Gerador de criativos usando IA
- **Features**: Text-to-image, copy generation, A/B testing automático
- **Integração**: OpenAI + Ideogram API + Facebook Upload

#### `FacebookCampaignManager.tsx`
- **Função**: Gerenciador completo de campanhas Facebook
- **Features**: CRUD de campanhas, budget management, performance tracking
- **Integração**: Facebook Marketing API + Campaign Sync

---

### **🤖 Bot & Conversação**

#### `BotMetrics.tsx`
- **Função**: Métricas detalhadas do bot conversacional
- **Features**: Conversion rate, response time, conversation flow
- **Integração**: Conversation Analytics + Universal Bandits

#### `ConversationManager.tsx`
- **Função**: Gerenciador de conversas ativas
- **Features**: Chat interface, lead management, response suggestions
- **Integração**: WhatsApp Client + Conversation GPT

#### `WhatsAppIntegration.tsx`
- **Função**: Interface de integração WhatsApp
- **Features**: QR code display, connection status, message queue
- **Integração**: WhatsApp Service + Message Queue

---

### **🛠️ Configuração & Admin**

#### `ConfiguracaoApiCompleta.tsx`
- **Função**: Configuração completa de todas as APIs
- **Features**: Facebook token, OpenAI key, Ideogram config, validation
- **Integração**: User Settings + API Validation

#### `LoginScreen.tsx`
- **Função**: Tela de autenticação do sistema
- **Features**: Login/register, JWT handling, role-based access
- **Integração**: Auth Service + User Management

#### `UserSettings.tsx`
- **Função**: Configurações de usuário
- **Features**: Profile management, API keys, notifications settings
- **Integração**: User API + Settings Service

---

### **🎨 UI Components Base**

#### `CardComponents.tsx`
- **Função**: Componentes de cards reutilizáveis
- **Features**: Metric cards, action cards, status cards
- **Props**: title, value, trend, actions

#### `CommandPalette.tsx`
- **Função**: Paleta de comandos estilo Cmd+K
- **Features**: Quick actions, search, keyboard shortcuts
- **Integração**: Global actions + Search API

#### `LoadingSpinner.tsx`
- **Função**: Componente de loading personalizado
- **Features**: Multiple sizes, themed colors, overlay mode
- **Props**: size, color, overlay, message

---

## 🔧 **HOOKS CUSTOMIZADOS (/hooks)**

### **📊 Data Hooks**
- `useAnalytics.ts` - Hook para dados de analytics
- `useCampaigns.ts` - Hook para campanhas
- `useMLMetrics.ts` - Hook para métricas ML
- `useFacebookData.ts` - Hook para dados Facebook

### **🤖 Bot Hooks**
- `useConversations.ts` - Hook para conversas
- `useBotStatus.ts` - Hook para status do bot
- `useWhatsApp.ts` - Hook para WhatsApp

### **⚙️ System Hooks**
- `useAuth.ts` - Hook de autenticação
- `useSettings.ts` - Hook de configurações
- `useTheme.ts` - Hook de tema
- `useNotifications.ts` - Hook de notificações

---

## 🛠️ **SERVICES FRONTEND (/services)**

### **📡 API Services**
```typescript
// Estrutura dos serviços de API
services/
├── authService.ts - Autenticação
├── campaignService.ts - Campanhas
├── facebookService.ts - Facebook API
├── mlService.ts - Machine Learning
├── botService.ts - Bot conversacional
├── analyticsService.ts - Analytics
└── uploadService.ts - Upload de arquivos
```

### **🔄 State Management**
- `store/` - Zustand stores
- `context/` - React contexts
- `reducers/` - State reducers

---

## 📚 **LIBRARIES & UTILITIES (/lib)**

### **🎨 UI Libraries**
- `ui.ts` - Configuração shadcn/ui
- `utils.ts` - Utilitários UI (cn, formatters)
- `constants.ts` - Constantes da aplicação

### **🔧 Core Utils (/utils)**
```typescript
utils/
├── formatting.ts - Formatação de dados
├── validation.ts - Validações
├── api.ts - Helpers de API
├── date.ts - Utilitários de data
├── crypto.ts - Funções criptográficas
└── helpers.ts - Helpers gerais
```

---

## 🎯 **TYPES & INTERFACES (/types)**

### **📊 Business Types**
```typescript
types/
├── Campaign.ts - Tipos de campanha
├── User.ts - Tipos de usuário
├── Analytics.ts - Tipos de analytics
├── ML.ts - Tipos de ML
├── Bot.ts - Tipos do bot
├── Facebook.ts - Tipos Facebook API
└── Common.ts - Tipos comuns
```

### **🔗 API Types**
- `api.ts` - Tipos de requisições/respostas
- `events.ts` - Tipos de eventos
- `websocket.ts` - Tipos WebSocket

---

## 🎨 **STYLING SYSTEM (/styles)**

### **🌈 Design Tokens**
```css
styles/
├── globals.css - Estilos globais
├── components.css - Estilos de componentes
├── utilities.css - Classes utilitárias
├── animations.css - Animações customizadas
└── themes.css - Temas (dark/light)
```

### **📱 Responsive Design**
- Mobile-first approach
- Breakpoints customizados
- Container queries
- Fluid typography

---

## 📋 **DOCUMENTAÇÃO INTERNA (/docs)**

### **📖 Component Docs**
- `components.md` - Documentação de componentes
- `hooks.md` - Documentação de hooks
- `services.md` - Documentação de serviços
- `architecture.md` - Arquitetura frontend

### **🎨 Design System**
- `design-tokens.md` - Tokens de design
- `component-library.md` - Biblioteca de componentes
- `patterns.md` - Padrões de desenvolvimento

---

## 🚀 **PERFORMANCE & OPTIMIZATION**

### **⚡ Code Splitting**
- Lazy loading de componentes
- Route-based splitting
- Dynamic imports

### **📦 Bundle Optimization**
- Tree shaking configurado
- Dependencies otimizadas
- Build size monitoring

### **🔄 Caching Strategy**
- React Query para server state
- Local storage para settings
- Service worker (PWA ready)

---

## 🧪 **TESTING STRUCTURE**

### **🔬 Test Organization**
```
__tests__/
├── components/ - Testes de componentes
├── hooks/ - Testes de hooks
├── services/ - Testes de serviços
├── utils/ - Testes de utilitários
└── integration/ - Testes de integração
```

### **🛠️ Testing Tools**
- Vitest para unit tests
- React Testing Library
- MSW para mocking
- Playwright para E2E

---

## 🎯 **PRINCIPAIS FEATURES**

✅ **Design System** completo com shadcn/ui  
✅ **TypeScript** strict mode para type safety  
✅ **Performance** otimizada com lazy loading  
✅ **Responsive** design mobile-first  
✅ **Dark/Light** theme support  
✅ **Real-time** updates com WebSocket  
✅ **Accessibility** (WCAG compliance)  
✅ **Internationalization** ready  

---

*Esta estrutura representa um frontend de **nível enterprise** com arquitetura escalável e maintível* 🌟
