export class ImageProcessor {
  async processImage(imageUrl: string, leadId: string, text?: string) {
    console.log(`🖼️ Processing image for lead ${leadId}: ${imageUrl}`)
    
    return {
      analysis: '[Imagem recebida]',
      response: 'Recebi sua imagem! Como posso ajudar você com nossa Calcinha Lipo Modeladora?'
    }
  }
}
