// Lista real de cidades COD para Calcinha Lipo (cidades que realmente atendemos)
const COD_CITIES = [
  // São Paulo e região metropolitana
  'São Paulo - SP','Taboão da Serra - SP','São Bernardo do Campo - SP','Osasco - SP','Guarulhos - SP','Diadema - SP','Santo André - SP',
  'Itapecerica da Serra - SP','Carapicuíba - SP','Itaquaquecetuba - SP','Barueri - SP','Mauá - SP','Ferraz de Vasconcelos - SP',
  'São Caetano do Sul - SP','Suzano - SP','Cotia - SP','Embu das Artes - SP','Poá - SP','Itapevi - SP','Jandira - SP','Mogi das Cruzes - SP',
  
  // Recife e região metropolitana
  'Recife - PE','Olinda - PE','Jaboatão dos Guararapes - PE','Camaragibe - PE','Paulista - PE','Abreu e Lima - PE',
  
  // Goiânia e região metropolitana
  'Goiânia - GO','Senador Canedo - GO','Aparecida de Goiânia - GO','Trindade - GO','Goianira - GO',
  
  // Fortaleza e região metropolitana
  'Fortaleza - CE','Caucaia - CE','Maracanaú - CE','Eusébio - CE','Pacatuba - CE','Maranguape - CE',
  
  // Rio de Janeiro e região metropolitana
  'Rio de Janeiro - RJ','Niterói - RJ','Duque de Caxias - RJ','São João de Meriti - RJ','Nilópolis - RJ',
  'Mesquita - RJ','Nova Iguaçu - RJ','São Gonçalo - RJ','Queimados - RJ',
  
  // Salvador e região metropolitana
  'Salvador - BA','Lauro de Freitas - BA','Simões Filho - BA','Camaçari - BA',
  
  // Belo Horizonte e região metropolitana
  'Belo Horizonte - MG','Nova Lima - MG','Sarzedo - MG','Contagem - MG','Betim - MG',
  'Ribeirão das Neves - MG','Sabará - MG','Ibirité - MG','Santa Luzia - MG',
  
  // Porto Alegre e região metropolitana
  'Porto Alegre - RS','Canoas - RS','Esteio - RS','São Leopoldo - RS','Novo Hamburgo - RS',
  'Gravataí - RS','Sapucaia do Sul - RS','Viamão - RS','Cachoeirinha - RS','Alvorada - RS'
]

export const LIPO_MODELADORA = {
  // Removido preços fixos - agora usa Universal Bandits para pricing dinâmico
  // Os preços são determinados pelo ML baseado em contexto e performance
  presentation: [ 'Calcinha modeladora confortável', 'Modela cintura e não marca', 'Promoção hoje' ],
  cities: COD_CITIES
}
export const ProductScripts = { LIPO_MODELADORA }
