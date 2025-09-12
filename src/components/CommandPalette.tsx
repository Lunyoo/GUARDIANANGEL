import React, { useEffect, useState } from 'react'

interface PaletteTab { id: string; label: string }
interface Props {
	isOpen: boolean
	onClose: () => void
	tabs: PaletteTab[]
	activeTab: string
	onSelectTab: (id: string) => void
}

// CommandPalette
// Implementação simples com busca local sobre as tabs fornecidas.
export default function CommandPalette({ isOpen, onClose, tabs, onSelectTab, activeTab }: Props) {
	const [query, setQuery] = useState('')
	const [index, setIndex] = useState(0)

	const filtered = tabs.filter(t => t.label.toLowerCase().includes(query.toLowerCase()) || t.id.includes(query.toLowerCase()))

	useEffect(() => {
		if (!isOpen) return
		function handler(e: KeyboardEvent) {
			if (e.key === 'Escape') { onClose(); return }
			if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % Math.max(filtered.length, 1)) }
			if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1)) }
			if (e.key === 'Enter') {
				const sel = filtered[index]
				if (sel) { onSelectTab(sel.id); onClose() }
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [isOpen, filtered, index])

	useEffect(() => { if (isOpen) { setQuery(''); setIndex(0) } }, [isOpen])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
				<div className="p-3 border-b border-gray-700">
					<input
						autoFocus
						value={query}
						onChange={e => { setQuery(e.target.value); setIndex(0) }}
						placeholder="Buscar comando..."
						className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-md outline-none placeholder-gray-500"
					/>
				</div>
				<ul className="max-h-80 overflow-y-auto">
					{filtered.length === 0 && (
						<li className="px-4 py-3 text-sm text-gray-500">Nenhum resultado</li>
					)}
					{filtered.map((t, i) => (
						<li
							key={t.id}
							onClick={() => { onSelectTab(t.id); onClose() }}
							className={`px-4 py-3 text-sm cursor-pointer flex items-center justify-between ${i === index ? 'bg-cyan-600/20 text-cyan-300' : 'hover:bg-gray-800 text-gray-300'} ${t.id === activeTab ? 'font-semibold' : ''}`}
						>
							<span>{t.label}</span>
							{t.id === activeTab && <span className="text-[10px] px-2 py-1 rounded bg-cyan-600/30 text-cyan-300">ATUAL</span>}
						</li>
					))}
				</ul>
				<div className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-700 flex justify-between">
					<span>↑↓ navegar • Enter abrir • Esc fechar</span>
					<span>{filtered.length} resultado(s)</span>
				</div>
			</div>
		</div>
	)
}

