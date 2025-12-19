
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CURRENCIES, INITIAL_CATEGORIES } from './constants';
import { CurrencyCode, FinanceCategory, CategoryType } from './types';

const App: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedMonth, setSelectedMonth] = useState('Marzo 2024');
  const [categories, setCategories] = useState<FinanceCategory[]>(INITIAL_CATEGORIES);
  
  const [activeTab, setActiveTab] = useState<CategoryType>('income');
  const [isAdding, setIsAdding] = useState<{ parentId: string | null, type: CategoryType } | null>(null);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState(0);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');

  const currency = useMemo(() => 
    CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0],
    [selectedCurrency]
  );

  const formatValue = (value: number) => {
    const converted = value * currency.rate;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
    }).format(converted);
  };

  const getChildren = (parentId: string) => categories.filter(c => c.parentId === parentId);

  const getEffectiveAmount = (cat: FinanceCategory): number => {
    const children = getChildren(cat.id);
    if (children.length > 0) {
      return children.reduce((sum, child) => sum + getEffectiveAmount(child), 0);
    }
    return cat.amount;
  };

  // Fuentes de ingreso principales (para el selector)
  const incomeSources = useMemo(() => 
    categories.filter(c => c.type === 'income' && c.parentId === null),
  [categories]);

  const totals = useMemo(() => {
    const mainCategories = categories.filter(c => c.parentId === null);
    const income = mainCategories.filter(c => c.type === 'income').reduce((sum, c) => sum + getEffectiveAmount(c), 0);
    const expenses = mainCategories.filter(c => c.type === 'expense').reduce((sum, c) => sum + getEffectiveAmount(c), 0);
    return { income, expenses, balance: income - expenses };
  }, [categories]);

  // Calcular cuánto se ha descontado de cada fuente de ingreso
  const getIncomeUsage = (incomeId: string) => {
    const linkedExpenses = categories.filter(c => c.type === 'expense' && c.sourceIncomeId === incomeId);
    return linkedExpenses.reduce((sum, exp) => sum + getEffectiveAmount(exp), 0);
  };

  const handleAddCategory = () => {
    if (!newName.trim() || !isAdding) return;
    
    const colors = ['#13ec6a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const icons = isAdding.type === 'income' ? ['payments', 'trending_up', 'work', 'redeem'] : ['shopping_cart', 'home', 'restaurant', 'directions_car'];
    
    const newCat: FinanceCategory = {
      id: Date.now().toString(),
      parentId: isAdding.parentId,
      name: newName,
      type: isAdding.type,
      amount: 0,
      budget: newBudget,
      color: colors[categories.length % colors.length],
      icon: icons[categories.length % icons.length],
      sourceIncomeId: isAdding.type === 'expense' ? selectedSourceId : undefined
    };

    setCategories([...categories, newCat]);
    setNewName('');
    setNewBudget(0);
    setSelectedSourceId('');
    setIsAdding(null);
  };

  const updateAmount = (id: string, val: number) => {
    setCategories(categories.map(c => c.id === id ? { ...c, amount: val } : c));
  };

  const deleteCategory = (id: string) => {
    if (confirm('¿Eliminar esta categoría y sus subcategorías?')) {
      const idsToDelete = new Set([id]);
      const findChildren = (pid: string) => {
        categories.forEach(c => {
          if (c.parentId === pid) {
            idsToDelete.add(c.id);
            findChildren(c.id);
          }
        });
      };
      findChildren(id);
      setCategories(categories.filter(c => !idsToDelete.has(c.id)));
    }
  };

  const chartData = useMemo(() => {
    return categories
      .filter(c => c.parentId === null && c.type === activeTab)
      .map(c => ({ name: c.name, value: getEffectiveAmount(c) || 0.1, color: c.color }));
  }, [categories, activeTab]);

  const renderCategoryRow = (cat: FinanceCategory, depth = 0) => {
    const children = getChildren(cat.id);
    const amount = getEffectiveAmount(cat);
    const isOver = cat.type === 'expense' && cat.budget > 0 && amount > cat.budget;
    const hasChildren = children.length > 0;
    
    // Para ingresos, mostrar cuánto queda disponible después de gastos vinculados
    const usedFromIncome = cat.type === 'income' ? getIncomeUsage(cat.id) : 0;
    const incomeBalance = cat.type === 'income' ? amount - usedFromIncome : 0;

    return (
      <div key={cat.id} className="flex flex-col gap-2">
        <div 
          className={`bg-white rounded-2xl p-4 border transition-all group ${depth > 0 ? 'ml-6 border-l-4' : 'border-[#cfe7d9] shadow-sm'}`}
          style={{ borderLeftColor: depth > 0 ? cat.color : undefined }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div 
                className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
              >
                <span className="material-symbols-outlined text-xl">{cat.icon}</span>
              </div>
              <div className="truncate">
                <span className="font-bold text-[#0d1b13] block truncate text-sm">{cat.name}</span>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {cat.parentId ? 'Subcategoría' : 'Principal'} • {cat.type === 'income' ? 'Esperado' : 'Meta'}: {formatValue(cat.budget)}
                    </span>
                    {cat.type === 'expense' && cat.sourceIncomeId && (
                        <span className="text-[9px] font-black text-[#13ec6a] uppercase flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[10px]">link</span>
                            Desde: {categories.find(c => c.id === cat.sourceIncomeId)?.name || 'Desconocido'}
                        </span>
                    )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                {hasChildren ? (
                  <span className="block font-black text-[#0d1b13] text-sm pr-2">{formatValue(amount)}</span>
                ) : (
                  <input 
                    type="number"
                    value={cat.amount || ''}
                    placeholder="0.00"
                    onChange={(e) => updateAmount(cat.id, Number(e.target.value))}
                    className="block w-20 text-right border-none bg-gray-50 rounded-lg p-1 text-sm font-black text-[#0d1b13] focus:ring-1 focus:ring-[#13ec6a]"
                  />
                )}
                <span className={`text-[9px] font-bold ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                  {cat.type === 'income' ? `LIBRE: ${formatValue(incomeBalance)}` : (isOver ? 'EXCEDIDO' : 'ACTUAL')}
                </span>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIsAdding({ parentId: cat.id, type: cat.type })} className="text-gray-400 hover:text-[#13ec6a]">
                  <span className="material-symbols-outlined text-lg">add_box</span>
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-500">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Barra de progreso visual */}
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
            <div 
                className={`h-full transition-all duration-700 ${cat.type === 'income' ? 'bg-[#13ec6a]' : (isOver ? 'bg-red-500' : 'bg-[#0d1b13]')}`}
                style={{ 
                    width: cat.type === 'income' 
                        ? `${Math.max(0, Math.min((incomeBalance / (amount || 1)) * 100, 100))}%` 
                        : `${Math.min((amount / (cat.budget || 1)) * 100, 100)}%` 
                }}
            ></div>
          </div>
          {cat.type === 'income' && usedFromIncome > 0 && (
            <p className="text-[8px] font-black text-gray-400 mt-1 uppercase text-right">
              {formatValue(usedFromIncome)} comprometido en gastos
            </p>
          )}
        </div>
        {children.map(child => renderCategoryRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] pb-20">
      <div className="max-w-md mx-auto bg-[#f6f8f7] shadow-xl min-h-screen flex flex-col">
        
        {/* Header */}
        <header className="px-6 pt-10 pb-4 flex items-center justify-between sticky top-0 bg-[#f6f8f7]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <div className="bg-[#0d1b13] p-1.5 rounded-lg">
                <span className="material-symbols-outlined text-white text-xl">account_balance</span>
            </div>
            <h1 className="text-xl font-black text-[#0d1b13] tracking-tight italic">FinanceFlow Pro</h1>
          </div>
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
            className="bg-white border-[#cfe7d9] text-[#0d1b13] font-bold text-xs rounded-full py-1 px-3 shadow-sm focus:ring-[#13ec6a]"
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </header>

        <main className="px-5 flex flex-col gap-6 mt-4">
          
          {/* Consolidated Summary */}
          <div className="bg-[#0d1b13] rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute right-0 top-0 w-32 h-32 bg-[#13ec6a] rounded-full blur-[80px] opacity-20"></div>
             <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Balance Consolidado</p>
             <h2 className={`text-4xl font-black mb-6 ${totals.balance >= 0 ? 'text-[#13ec6a]' : 'text-red-400'}`}>
                {formatValue(totals.balance)}
             </h2>
             
             <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-1.5 text-[#13ec6a]">
                      <span className="material-symbols-outlined text-sm font-bold">arrow_downward</span>
                      <span className="text-[10px] font-black uppercase">Ingresos</span>
                   </div>
                   <span className="text-lg font-bold">{formatValue(totals.income)}</span>
                </div>
                <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
                   <div className="flex items-center gap-1.5 text-red-400">
                      <span className="material-symbols-outlined text-sm font-bold">arrow_upward</span>
                      <span className="text-[10px] font-black uppercase">Gastos</span>
                   </div>
                   <span className="text-lg font-bold">{formatValue(totals.expenses)}</span>
                </div>
             </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white rounded-3xl p-6 border border-[#cfe7d9] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                 <button 
                  onClick={() => setActiveTab('income')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'income' ? 'bg-white text-[#0d1b13] shadow-sm' : 'text-gray-400'}`}
                 >Ingresos</button>
                 <button 
                  onClick={() => setActiveTab('expense')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'expense' ? 'bg-white text-[#0d1b13] shadow-sm' : 'text-gray-400'}`}
                 >Gastos</button>
              </div>
            </div>
            
            <div className="flex items-center gap-6 h-32">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                 {chartData.slice(0, 3).map((item, i) => (
                   <div key={i} className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                        <span className="text-gray-500 truncate">{item.name}</span>
                      </div>
                      <span className="text-[#0d1b13]">{Math.round((item.value / (activeTab === 'income' ? totals.income : totals.expenses || 1)) * 100)}%</span>
                   </div>
                 ))}
                 {chartData.length > 3 && <span className="text-[9px] text-gray-300 italic font-bold">Y {chartData.length - 3} más...</span>}
              </div>
            </div>
          </div>

          {/* Categories List */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-black text-[#0d1b13]">
                {activeTab === 'income' ? 'Fuentes de Ingreso' : 'Desglose de Gastos'}
              </h3>
              <button 
                onClick={() => setIsAdding({ parentId: null, type: activeTab })}
                className="bg-[#13ec6a] text-[#0d1b13] px-3 py-1.5 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-transform flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nuevo
              </button>
            </div>

            {/* Modal de adición simplificado */}
            {isAdding && (
              <div className="bg-white border-2 border-[#13ec6a] rounded-2xl p-4 shadow-xl animate-in zoom-in duration-200 flex flex-col gap-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                   {isAdding.parentId ? `Añadir subcategoría` : `Añadir principal (${activeTab === 'income' ? 'Ingreso' : 'Gasto'})`}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                   <input 
                    autoFocus
                    placeholder="Nombre..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="border-[#cfe7d9] rounded-xl text-sm p-2 focus:ring-[#13ec6a] font-bold"
                   />
                   <input 
                    type="number"
                    placeholder={activeTab === 'income' ? "Esperado..." : "Presupuesto..."}
                    value={newBudget || ''}
                    onChange={e => setNewBudget(Number(e.target.value))}
                    className="border-[#cfe7d9] rounded-xl text-sm p-2 focus:ring-[#13ec6a] font-bold"
                   />
                </div>

                {isAdding.type === 'expense' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase">Origen de los Fondos</label>
                        <select 
                            value={selectedSourceId}
                            onChange={e => setSelectedSourceId(e.target.value)}
                            className="border-[#cfe7d9] rounded-xl text-xs p-2 focus:ring-[#13ec6a] font-bold bg-gray-50"
                        >
                            <option value="">Selecciona Ingreso (Opcional)</option>
                            {incomeSources.map(source => (
                                <option key={source.id} value={source.id}>
                                    {source.name} (Saldo: {formatValue(getEffectiveAmount(source) - getIncomeUsage(source.id))})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex gap-2">
                   <button onClick={handleAddCategory} className="flex-1 bg-[#0d1b13] text-white py-2 rounded-xl text-xs font-bold">Guardar</button>
                   <button onClick={() => setIsAdding(null)} className="px-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold">Cerrar</button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 pb-10">
              {categories
                .filter(c => c.parentId === null && c.type === activeTab)
                .map(cat => renderCategoryRow(cat))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default App;
