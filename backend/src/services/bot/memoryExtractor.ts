export function extractEntities(_text: string): { 
  city?: string
  size?: string
  intents?: string[]
  last_objection?: string
} { 
  return {} 
}
export function mergeContext(base:any, extra:any){ return { ...(base||{}), ...(extra||{}) } }
