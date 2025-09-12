-- Adicionar campo bot_enabled na tabela conversations
-- Para habilitar/desabilitar bot por conversa

ALTER TABLE conversations ADD COLUMN bot_enabled INTEGER DEFAULT 1;

-- Atualizar todas as conversas existentes para ter bot habilitado por padrão
UPDATE conversations SET bot_enabled = 1 WHERE bot_enabled IS NULL;

-- Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_conversations_bot_enabled ON conversations(bot_enabled);
