import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { createWriteStream } from 'fs'
import https from 'https'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy'
})

/**
 * 🎧 Transcreve áudio usando Whisper da OpenAI
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    console.log('🎧 Transcrevendo áudio:', audioUrl)
    
    // Download do áudio
    const audioPath = await downloadAudio(audioUrl)
    
    // Transcrição com Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: 'pt', // Português
      response_format: 'text'
    })
    
    // Limpa arquivo temporário
    fs.unlinkSync(audioPath)
    
    console.log('✅ Áudio transcrito:', transcription)
    return transcription.toString()
    
  } catch (error) {
    console.error('❌ Erro na transcrição:', error)
    return '[Não foi possível transcrever o áudio]'
  }
}

/**
 * 📥 Download de áudio temporário
 */
async function downloadAudio(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = `audio_${Date.now()}.ogg`
    const filePath = path.join('/tmp', fileName)
    const file = createWriteStream(filePath)
    
    https.get(url, (response) => {
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve(filePath)
      })
      
      file.on('error', (err) => {
        fs.unlinkSync(filePath)
        reject(err)
      })
    }).on('error', reject)
  })
}

/**
 * 🎤 Detecta intenção por áudio
 */
export function detectAudioIntent(transcription: string): 'urgent' | 'normal' | 'question' {
  const text = transcription.toLowerCase()
  
  if (text.includes('urgente') || text.includes('rápido') || text.includes('agora')) {
    return 'urgent'
  }
  
  if (text.includes('?') || text.includes('como') || text.includes('quanto')) {
    return 'question'
  }
  
  return 'normal'
}
