import React, { useState, useEffect } from 'react';
import { 
  MapPin, Search, Plus, Trash2, CheckCircle, AlertCircle, 
  Bot, MessageSquare, Settings, Zap, Globe, Filter,
  Eye, EyeOff, Edit3, Save, X
} from 'lucide-react';

interface City {
  city: string;
  state: string;
  active: boolean;
}

interface CalcinhaProduct {
  id: string;
  name: string;
  cities?: City[] | string[];
  codCities?: string[];
  availableCities?: string[];
  [key: string]: any; // Allow for additional properties
}

interface Props {
  calcinhaProducts: CalcinhaProduct[];
  onCitiesUpdate: () => void;
}

const CodCitiesManager: React.FC<Props> = ({ calcinhaProducts, onCitiesUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newCity, setNewCity] = useState({ city: '', state: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [conversationPrompt, setConversationPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Debug logs
  console.log('🏙️ CodCitiesManager - calcinhaProducts:', calcinhaProducts);
  console.log('🏙️ CodCitiesManager - products count:', calcinhaProducts?.length || 0);
  
  // Early return if no products
  if (!calcinhaProducts || !Array.isArray(calcinhaProducts) || calcinhaProducts.length === 0) {
    return (
      <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700/30 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Gerenciamento de Cidades COD</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum produto calcinha encontrado</p>
          <p className="text-sm mt-1">Adicione produtos do tipo calcinha para gerenciar cidades COD</p>
        </div>
      </div>
    );
  }

  // Get all cities from all calcinha products - handle different data structures
  const allCities = (calcinhaProducts || []).flatMap(product => {
    if (!product || !product.id || !product.name) {
      console.warn('Produto inválido encontrado:', product);
      return [];
    }

    // Handle different possible structures: cities, codCities, availableCities
    const citiesArray = product.cities || product.codCities || product.availableCities || [];
    
    // If it's an array of strings, convert to city objects
    if (Array.isArray(citiesArray) && citiesArray.length > 0) {
      if (typeof citiesArray[0] === 'string') {
        return (citiesArray as string[])
          .filter(cityStr => cityStr && typeof cityStr === 'string' && cityStr.trim())
          .map(cityStr => {
            const parts = cityStr.trim().split(' - ');
            return {
              city: parts[0] || cityStr.trim(),
              state: parts[1] || 'SP', // Default state if not provided
              active: true,
              productId: product.id,
              productName: product.name
            };
          });
      } else {
        // If it's already an array of objects
        return (citiesArray as City[])
          .filter(city => city && (city.city || (city as any).name))
          .map(city => ({
            city: (city.city || (city as any).name || '').trim(),
            state: (city.state || (city as any).uf || 'SP').trim(), // Default state
            active: city.active !== false, // default to true if not specified
            productId: product.id,
            productName: product.name
          }));
      }
    }
    
    return [];
  });

  // Remove duplicates and apply filters
  const uniqueCities = Array.from(
    new Map(allCities
      .filter(city => city && city.city && city.city.trim() && city.state && city.state.trim())
      .map(city => 
        [`${city.city.trim().toLowerCase()}-${city.state.trim().toLowerCase()}`, city]
      )
    ).values()
  );

  const filteredCities = (uniqueCities || []).filter(city => {
    if (!city || !city.city || !city.state) return false;
    
    const cityLower = city.city.toLowerCase();
    const stateLower = city.state.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = !searchTerm.trim() || 
      cityLower.includes(searchLower) ||
      stateLower.includes(searchLower);
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'active' && city.active) ||
      (filter === 'inactive' && !city.active);
    
    return matchesSearch && matchesFilter;
  });

  const activeCitiesCount = (uniqueCities || []).filter(c => c && c.active).length;
  const totalCitiesCount = (uniqueCities || []).length;

  // Debug logs
  console.log('🏙️ AllCities processed:', allCities.length);
  console.log('🏙️ UniqueCities:', uniqueCities.length);
  console.log('🏙️ FilteredCities:', filteredCities.length);
  console.log('🏙️ Sample cities:', uniqueCities.slice(0, 3));

  // Load conversation prompt on mount
  useEffect(() => {
    loadConversationPrompt();
  }, []);

  const loadConversationPrompt = async () => {
    try {
      const response = await fetch('/api/conversation/prompt/calcinha');
      if (response.ok) {
        const data = await response.json();
        setConversationPrompt(data.prompt || '');
        setOriginalPrompt(data.prompt || '');
      }
    } catch (error) {
      console.error('Erro ao carregar prompt:', error);
    }
  };

  const updateConversationPrompt = async () => {
    setLoading(true);
    try {
      const activeCitiesList = (uniqueCities || [])
        .filter(c => c && c.active && c.city && c.state)
        .map(c => `${c.city} - ${c.state}`)
        .join(', ');

      const updatedPrompt = conversationPrompt.replace(
        /CIDADES_COD:\s*[^}]*/,
        `CIDADES_COD: ${activeCitiesList}`
      );

      const response = await fetch('/api/conversation/prompt/calcinha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: updatedPrompt })
      });

      if (response.ok) {
        setOriginalPrompt(updatedPrompt);
        setConversationPrompt(updatedPrompt);
        setEditingPrompt(false);
      }
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCityStatus = async (cityName: string, state: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/calcinha/cities/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityName, state, active: true })
      });

      if (response.ok) {
        onCitiesUpdate();
        // Auto-update prompt with new cities
        setTimeout(updateConversationPrompt, 500);
      }
    } catch (error) {
      console.error('Erro ao alterar status da cidade:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewCity = async () => {
    if (!newCity.city.trim() || !newCity.state.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/products/calcinha/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          city: newCity.city.trim(),
          state: newCity.state.trim().toUpperCase(),
          active: true 
        })
      });

      if (response.ok) {
        setNewCity({ city: '', state: '' });
        setIsAdding(false);
        onCitiesUpdate();
        // Auto-update prompt with new city
        setTimeout(updateConversationPrompt, 500);
      }
    } catch (error) {
      console.error('Erro ao adicionar cidade:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeCity = async (cityName: string, state: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/calcinha/cities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityName, state })
      });

      if (response.ok) {
        onCitiesUpdate();
        // Auto-update prompt without removed city
        setTimeout(updateConversationPrompt, 500);
      }
    } catch (error) {
      console.error('Erro ao remover cidade:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-600/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h4 className="text-blue-300 font-medium">🏙️ Gerenciador COD - ConversationGPT</h4>
          <span className="text-xs bg-blue-700 text-blue-100 px-2 py-1 rounded">
            {activeCitiesCount}/{totalCitiesCount} ativas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingPrompt(!editingPrompt)}
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
          >
            <Bot className="w-3 h-3" />
            {editingPrompt ? 'Fechar' : 'Editar Prompt'}
          </button>
        </div>
      </div>

      {/* Conversation GPT Prompt Editor */}
      {editingPrompt && (
        <div className="mb-4 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 font-medium">Prompt ConversationGPT - Calcinha</span>
            <span className="text-xs text-purple-400">
              🤖 Conectado às cidades COD em tempo real
            </span>
          </div>
          
          <textarea
            value={conversationPrompt}
            onChange={(e) => setConversationPrompt(e.target.value)}
            className="w-full h-32 bg-gray-800 border border-gray-700 rounded text-white text-xs p-3 font-mono"
            placeholder="Digite o prompt para conversação da calcinha..."
          />
          
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-400">
              As cidades COD ativas são automaticamente sincronizadas no prompt
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConversationPrompt(originalPrompt);
                  setEditingPrompt(false);
                }}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
              >
                <X className="w-3 h-3" />
                Cancelar
              </button>
              <button
                onClick={updateConversationPrompt}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cidade ou estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded"
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
        >
          <Plus className="w-4 h-4" />
          Nova Cidade
        </button>
      </div>

      {/* Add New City Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-green-900/20 rounded-lg border border-green-600/30">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-green-400" />
            <span className="text-green-300 font-medium">Adicionar Nova Cidade COD</span>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome da cidade"
              value={newCity.city}
              onChange={(e) => setNewCity({ ...newCity, city: e.target.value })}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            />
            <input
              type="text"
              placeholder="UF"
              value={newCity.state}
              onChange={(e) => setNewCity({ ...newCity, state: e.target.value.toUpperCase() })}
              className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              maxLength={2}
            />
            <button
              onClick={addNewCity}
              disabled={loading || !newCity.city.trim() || !newCity.state.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewCity({ city: '', state: '' });
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredCities.map((city) => (
          <div
            key={`${city.city}-${city.state}`}
            className={`p-3 rounded-lg border transition-all ${
              city.active
                ? 'bg-green-900/20 border-green-600/30 hover:border-green-500/50'
                : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${city.active ? 'text-green-400' : 'text-gray-500'}`} />
                <span className={`font-medium text-sm ${city.active ? 'text-white' : 'text-gray-400'}`}>
                  {city.city}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                city.active ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-300'
              }`}>
                {city.state}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {city.active ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-gray-500" />
                )}
                <span className={`text-xs ${city.active ? 'text-green-400' : 'text-gray-500'}`}>
                  {city.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => toggleCityStatus(city.city, city.state)}
                  disabled={loading}
                  className={`p-1 rounded text-xs transition-colors disabled:opacity-50 ${
                    city.active
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                      : 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  }`}
                  title={city.active ? 'Desativar' : 'Ativar'}
                >
                  {city.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                
                <button
                  onClick={() => removeCity(city.city, city.state)}
                  disabled={loading}
                  className="p-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors disabled:opacity-50"
                  title="Remover cidade"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCities.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma cidade encontrada</p>
          {searchTerm && (
            <p className="text-sm mt-1">Tente buscar por outro termo</p>
          )}
          
          {/* Debug info */}
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>📊 Debug: {calcinhaProducts?.length || 0} produtos calcinha</p>
            <p>🏙️ Total cidades processadas: {allCities.length}</p>
            <p>🎯 Cidades únicas: {uniqueCities.length}</p>
            <p>🔍 Filtro atual: {filter}</p>
            <p>📝 Termo busca: "{searchTerm}"</p>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              {activeCitiesCount} cidades ativas no COD
            </span>
            <span className="flex items-center gap-1">
              <Bot className="w-3 h-3 text-purple-400" />
              ConversationGPT sincronizado
            </span>
          </div>
          <span className="text-blue-400">
            🚀 Atualização automática do prompt IA
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodCitiesManager;
