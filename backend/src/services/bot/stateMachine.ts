export function decideNextState(_params:any){
  // Simplified state transitions placeholder
  const last = _params.lastState || 'initial'
  return { next: last === 'initial'? 'qualifying': last, actions: ['ask_intro_question'] }
}
