import fs from 'fs'
import path from 'path'

interface FeatureRecord { key: string; value: any; ts: number; ttl?: number }

class FeatureStoreCore {
	private static _i: FeatureStoreCore
	static instance(){ return this._i || (this._i = new FeatureStoreCore()) }

	private data = new Map<string, FeatureRecord>()
	private file: string
	private constructor(){
		const dir = path.join(process.cwd(),'data'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
		this.file = path.join(dir,'feature-store.json'); this.load()
	}
	private load(){ try { if(fs.existsSync(this.file)){ const arr = JSON.parse(fs.readFileSync(this.file,'utf-8')); arr.forEach((r:FeatureRecord)=> this.data.set(r.key,r)) } } catch {} }
	private save(){
			try {
				const snapshot = [...this.data.values()].slice(-5000)
				fs.writeFileSync(this.file, JSON.stringify(snapshot, null, 2))
			} catch {}
		}
		set(key:string, value:any, ttlMs?:number){
			this.data.set(key,{ key, value, ts: Date.now(), ttl: ttlMs });
			this.save()
		}
		get<T=any>(key:string): T | null {
			const r = this.data.get(key); if(!r) return null;
			if(r.ttl && Date.now() - r.ts > r.ttl){ this.data.delete(key); return null }
			return r.value as T
		}
		incr(key:string, delta=1){
			const v = this.get<number>(key) || 0; this.set(key, v+delta); return v+delta
		}
		keys(prefix=''){
			return [...this.data.keys()].filter(k=>k.startsWith(prefix))
		}
		exportAll(){ return [...this.data.values()] }
}

export const featureStore = FeatureStoreCore.instance()
export const getFeature = <T=any>(k:string)=> featureStore.get<T>(k)
export const setFeature = (k:string,v:any,ttl?:number)=> featureStore.set(k,v,ttl)