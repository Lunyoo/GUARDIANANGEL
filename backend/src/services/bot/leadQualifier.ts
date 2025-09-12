class LeadQualifier { async qualifyLead(_phone:string,_text:string,_count:number){ return { score:0.5, category:'MEDIUM', suggestedApproach:'QUALIFY_FIRST', estimatedConversionChance:0.25 } } }
export const leadQualifier = new LeadQualifier()
