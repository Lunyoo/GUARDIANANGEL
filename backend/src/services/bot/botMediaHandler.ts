export class BotMediaHandler { 
  static async processGPTResponse(text: string, _productCode: string) { 
    return { 
      text,
      media: undefined as any
    } 
  } 
}
