// City service: suggestion + COD tracking (restored minimal)
class CityService {
	private codCities: Set<string> = new Set()
	private allCities: Set<string> = new Set()

	async load(map: Record<string, string[]>) {
		for (const list of Object.values(map)) {
			for (const city of list) this.allCities.add(this.normalize(city))
		}
		this.codCities = new Set(this.allCities)
	}
	addCODCities(cities: string[]) {
		for (const c of cities) this.codCities.add(this.normalize(c))
	}
	getSuggestion(prefix: string, limit=15) {
		const norm = this.normalize(prefix)
		const out: string[] = []
		for (const city of this.allCities) {
			if (city.startsWith(norm)) out.push(city)
			if (out.length >= limit) break
		}
		return out
	}
	hasCODCity(city:string){ return this.codCities.has(this.normalize(city)) }
	private normalize(s:string){ return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'') }
}
export const cityService = new CityService()
