import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ConversationController {
  
  // Get conversation prompt for a product
  async getPrompt(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      
      // Check if prompt exists in database
      let prompt = null;
      try {
        prompt = await prisma.conversationPrompt.findUnique({
          where: { productId }
        });
      } catch (dbError) {
        console.warn('ConversationPrompt table may not exist:', dbError);
      }

      // If no prompt exists, create default for calcinha
      if (!prompt && productId === 'calcinha') {
        const defaultPrompt = `
Você é um assistente especializado em vendas da Calcinha Lipo Modeladora Premium.

PRODUTO: Calcinha Lipo Modeladora Premium
- Efeito modelador instantâneo
- Reduz até 3 tamanhos na cintura
- Material respirável e confortável
- Cores disponíveis: Bege, Preta
- Tamanhos: P, M, G, GG

PREÇOS DISPONÍVEIS:
- 1 unidade: R$ 89,90 - R$ 119,90
- 2 unidades: R$ 129,90 - R$ 179,90  
- 3 unidades: R$ 169,90 - R$ 219,90
- 4 unidades: R$ 199,90 - R$ 239,90

CIDADES_COD: [Lista será atualizada automaticamente]

INSTRUÇÕES:
1. Seja entusiasta e confiante sobre os benefícios
2. Use o preço ideal baseado no perfil do cliente
3. Mencione apenas cidades COD disponíveis
4. Ofereça combos para maior economia
5. Destaque o frete grátis via COD

Responda de forma natural e persuasiva!`;

        try {
          prompt = await prisma.conversationPrompt.create({
            data: {
              productId,
              prompt: defaultPrompt,
              lastUpdated: new Date()
            }
          });
        } catch (createError) {
          console.warn('Could not create prompt in database:', createError);
          // Return default prompt without storing
          return res.json({ 
            prompt: defaultPrompt,
            lastUpdated: new Date(),
            fromDefault: true
          });
        }
      }

      res.json({ 
        prompt: prompt?.prompt || '',
        lastUpdated: prompt?.lastUpdated 
      });
    } catch (error) {
      console.error('Erro ao buscar prompt:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Update conversation prompt for a product
  async updatePrompt(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt é obrigatório' });
      }

      const updatedPrompt = await prisma.conversationPrompt.upsert({
        where: { productId },
        update: {
          prompt,
          lastUpdated: new Date()
        },
        create: {
          productId,
          prompt,
          lastUpdated: new Date()
        }
      });

      res.json({ 
        success: true,
        prompt: updatedPrompt.prompt,
        lastUpdated: updatedPrompt.lastUpdated
      });
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Get conversation context
  async getContext(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      
      const context = await prisma.conversationContext.findUnique({
        where: { conversationId }
      });

      res.json(context || {});
    } catch (error) {
      console.error('Erro ao buscar contexto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Update conversation context
  async updateContext(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const contextData = req.body;

      const context = await prisma.conversationContext.upsert({
        where: { conversationId },
        update: {
          ...contextData,
          lastUpdated: new Date()
        },
        create: {
          conversationId,
          ...contextData,
          lastUpdated: new Date()
        }
      });

      res.json({ success: true, context });
    } catch (error) {
      console.error('Erro ao atualizar contexto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
