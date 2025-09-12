// Autoritative COD cities list aligned with productScripts.LIPO_MODELADORA.cities
// Note: We provide a per-state mapping where possible; cities without explicit UF in productScripts are grouped by best-known UF.

export const COD_CITIES: Record<string,string[]> = {
  SP: [
    'São Paulo','Taboão da Serra','São Bernardo do Campo','Osasco','Guarulhos','Diadema','Santo André',
    'Itapecerica da Serra','Carapicuíba','Itaquaquecetuba','Barueri','Mauá','Ferraz de Vasconcelos',
    'São Caetano do Sul','Suzano','Cotia','Embu das Artes','Poá','Itapevi','Jandira','Mogi das Cruzes'
  ],
  PE: [
    'Recife','Olinda','Jaboatão dos Guararapes','Camaragibe','Paulista','Abreu e Lima'
  ],
  GO: [
    'Goiânia','Senador Canedo','Aparecida de Goiânia','Trindade','Goianira'
  ],
  CE: [
    'Fortaleza','Caucaia','Maracanaú','Eusébio','Pacatuba','Maranguape'
  ],
  RJ: [
    'Rio de Janeiro','Niterói','Duque de Caxias','São João de Meriti','Nilópolis',
    'Mesquita','Nova Iguaçu','São Gonçalo','Queimados'
  ],
  BA: [
    'Salvador','Lauro de Freitas','Simões Filho','Camaçari'
  ],
  MG: [
    'Belo Horizonte','Nova Lima','Sarzedo','Contagem','Betim','Ribeirão das Neves','Sabará','Ibirité','Santa Luzia'
  ],
  RS: [
    'Porto Alegre','Canoas','Esteio','São Leopoldo','Novo Hamburgo','Gravataí','Sapucaia do Sul','Viamão','Cachoeirinha','Alvorada'
  ]
}

export function isCODAvailable(city: string){
  const normalize = (s:string) => s.normalize('NFD').replace(/[^\p{L}\s]/gu,'').toLowerCase().trim()
  const c = normalize(city)
  return Object.values(COD_CITIES).some(list => list.some(item => normalize(item) === c))
}
