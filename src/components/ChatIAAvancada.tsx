import React, { useState, useRef, useEffect } from 'react';
import { useKV } from '@/hooks/useKV';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { spark } from '@/lib/sparkCompat'
import { toast } from 'sonner'
import {
  Bot,
  Send,
  Image,
  Mic,
  MoreVertical,
  Maximize2,
  Minimize2,
  X,
  Upload,
  Loader2,
  Sparkles,
  Zap,
  Brain,
  Settings,
  Trash2,
  Download
} from 'lucide-react'

interface MensagemChat {
  id: string
  texto: string
  autor: 'usuario' | 'ia'
  timestamp: Date | string
  imagem?: string
  metadata?: {
    comando?: string
    resultado?: any
  }
}

interface ChatIAAvancadaProps {
  isOpen: boolean
  onClose: () => void
  campanhas: any[]
  criativos: any[]
  onSystemUpdate?: (action: string, data: any) => void
}

export default function ChatIAAvancada({ 
  isOpen, 
  onClose, 
  campanhas, 
  criativos,
  onSystemUpdate 
}: ChatIAAvancadaProps) {
  const [mensagens, setMensagens] = useKV<MensagemChat[]>('chat-ia-historico', [])
  const [inputMensagem, setInputMensagem] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Utility function to safely format timestamp
  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = new Date(timestamp)
      return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Data inválida'
    }
  }

  // Auto scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Imagem muito grande. Máximo 10MB.')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const processarComandoIA = async (comando: string, contexto?: any) => {
    // Simular processamento de comando da IA
    try {
      // Aqui a IA pode executar comandos no sistema
      switch (comando.toLowerCase()) {
        case 'analisar campanhas':
          return {
            resultado: `Analisando ${campanhas.length} campanhas...`,
            dados: campanhas.slice(0, 5)
          }
        case 'otimizar criativos':
          return {
            resultado: `Otimizando ${criativos.length} criativos...`,
            dados: criativos.slice(0, 3)
          }
        case 'gerar relatório':
          return {
            resultado: 'Relatório gerado com sucesso',
            dados: { campanhas: campanhas.length, criativos: criativos.length }
          }
        default:
          return {
            resultado: 'Comando processado com sucesso',
            dados: contexto
          }
      }
    } catch (error) {
      throw new Error(`Erro ao processar comando: ${error}`)
    }
  }

  const enviarMensagem = async () => {
    if (!inputMensagem.trim() && !imageFile) return

    const novaMensagem: MensagemChat = {
      id: Date.now().toString(),
      texto: inputMensagem,
      autor: 'usuario',
      timestamp: new Date(),
      imagem: imagePreview || undefined
    }

    // Adicionar mensagem do usuário
    setMensagens(mensagensAtuais => [...mensagensAtuais, novaMensagem])
    
    const mensagemTexto = inputMensagem
    setInputMensagem('')
    setImageFile(null)
    setImagePreview('')
    setIsLoading(true)

    try {
      // Construir contexto para a IA
      const contexto = {
        campanhas: campanhas.length,
        criativos: criativos.length,
        ultimaMensagem: mensagemTexto,
        temImagem: !!imagePreview,
        timestamp: new Date().toISOString()
      }

      // Gerar resposta da IA usando spark.llm
      const prompt = spark.llmPrompt`
        Você é NEXUS, uma IA avançada especializada em marketing digital e automação.
        
        CONTEXTO DO SISTEMA:
        - Campanhas ativas: ${campanhas.length}
        - Criativos disponíveis: ${criativos.length}
        - Mensagem do usuário: ${mensagemTexto}
        - Tem imagem anexada: ${!!imagePreview}
        
        SUAS CAPACIDADES:
        1. Analisar e otimizar campanhas em tempo real
        2. Criar e modificar criativos automaticamente  
        3. Executar comandos no sistema
        4. Gerar insights preditivos
        5. Automatizar processos de marketing
        
        PERSONALIDADE:
        - Seja direto e eficiente como um personagem de Solo Leveling
        - Use linguagem técnica mas acessível
        - Sempre ofereça ações práticas
        - Seja proativo em sugerir melhorias
        
        Responda de forma conversacional e ofereça ações específicas que pode executar.
      `

      const respostaIA = await spark.llm(prompt)
      
      // Processar comandos se a IA sugerir
  let metadata: MensagemChat['metadata'] | undefined = undefined
      if (respostaIA.toLowerCase().includes('executar') || respostaIA.toLowerCase().includes('analisar')) {
        try {
          const resultado = await processarComandoIA(mensagemTexto, contexto)
          metadata = resultado
          
          // Notificar sistema sobre mudanças se necessário
          if (onSystemUpdate) {
            onSystemUpdate('chat-command', {
              comando: mensagemTexto,
              resultado: resultado
            })
          }
        } catch (error) {
          console.error('Erro ao processar comando:', error)
        }
      }

      // Adicionar resposta da IA
      const respostaCompleta: MensagemChat = {
        id: (Date.now() + 1).toString(),
        texto: respostaIA,
        autor: 'ia',
        timestamp: new Date(),
        metadata
      }

      setMensagens(mensagensAtuais => [...mensagensAtuais, respostaCompleta])

      toast.success('NEXUS respondeu', {
        description: 'Mensagem processada com sucesso'
      })

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      
      const mensagemErro: MensagemChat = {
        id: (Date.now() + 1).toString(),
        texto: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        autor: 'ia',
        timestamp: new Date()
      }
      
      setMensagens(mensagensAtuais => [...mensagensAtuais, mensagemErro])
      toast.error('Erro na comunicação com NEXUS')
    } finally {
      setIsLoading(false)
    }
  }

  const limparHistorico = () => {
    setMensagens([])
    toast.success('Histórico do chat limpo')
  }

  const exportarHistorico = () => {
    const dataStr = JSON.stringify(mensagens, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `chat-nexus-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    toast.success('Histórico exportado')
  }

  if (!isOpen) return null

  const chatClassName = isMaximized 
    ? "fixed inset-4 z-50 bg-background border border-border rounded-xl shadow-2xl"
    : "fixed bottom-4 right-4 w-96 h-[600px] z-50 bg-background border border-border rounded-xl shadow-2xl"

  return (
    <div className={chatClassName}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              NEXUS
              <Badge variant="outline" className="text-xs bg-gradient-to-r from-primary/10 to-accent/10 animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                IA Avançada
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Processando...' : 'Online • Pronto para ajudar'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={exportarHistorico}
            disabled={mensagens.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={limparHistorico}
            disabled={mensagens.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea 
        className={`${isMaximized ? 'h-[calc(100vh-200px)]' : 'h-[400px]'} px-4`}
        ref={scrollRef}
      >
        <div className="space-y-4 py-4">
          {mensagens.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">Olá! Eu sou o NEXUS</h4>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Sua IA avançada para marketing digital. Posso analisar campanhas, otimizar criativos e executar comandos no sistema.
              </p>
            </div>
          )}
          
          {mensagens.map((mensagem) => (
            <div key={mensagem.id} className={`flex ${mensagem.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${mensagem.autor === 'usuario' ? 'order-1' : 'order-2'}`}>
                {mensagem.autor === 'ia' && (
                  <div className="flex items-center space-x-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">NEXUS</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(mensagem.timestamp)}
                    </span>
                  </div>
                )}
                
                <div className={`rounded-lg px-3 py-2 ${
                  mensagem.autor === 'usuario' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : 'bg-muted/50'
                }`}>
                  {mensagem.imagem && (
                    <img 
                      src={mensagem.imagem} 
                      alt="Imagem enviada" 
                      className="max-w-full rounded mb-2 max-h-48 object-cover"
                    />
                  )}
                  
                  <p className="text-sm whitespace-pre-wrap">{mensagem.texto}</p>
                  
                  {mensagem.metadata && (
                    <div className="mt-2 p-2 bg-card/50 rounded text-xs">
                      <div className="font-medium mb-1">Resultado do Comando:</div>
                      <div className="text-muted-foreground">
                        {JSON.stringify(mensagem.metadata?.resultado || {}, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
                
                {mensagem.autor === 'usuario' && (
                  <div className="flex items-center justify-end space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(mensagem.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">NEXUS está pensando...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        {imagePreview && (
          <div className="relative mb-2">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-20 rounded border object-cover"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => {
                setImagePreview('')
                setImageFile(null)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              placeholder="Converse com NEXUS... (ele pode executar comandos no sistema)"
              value={inputMensagem}
              onChange={(e) => setInputMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  enviarMensagem()
                }
              }}
              className="min-h-[40px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Image className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={enviarMensagem}
              disabled={(!inputMensagem.trim() && !imageFile) || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Enter para enviar • Shift+Enter para nova linha</span>
          <Badge variant="outline" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            {mensagens.length} mensagens
          </Badge>
        </div>
      </div>
    </div>
  )
}