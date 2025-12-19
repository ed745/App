
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CURRENCIES, INITIAL_CATEGORIES } from './constants';
import { CurrencyCode, FinanceCategory, CategoryType } from './types';

const App: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
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

  const incomeSources = useMemo(() => 
    categories.filter(c => c.type === 'income' && c.parentId === null),
  [categories]);

  const totals = useMemo(() => {
    const mainCategories = categories.filter(c => c.parentId === null);
    const income = mainCategories.filter(c => c.type === 'income').reduce((sum, c) => sum + getEffectiveAmount(c), 0);
    const expenses = mainCategories.filter(c => c.type === 'expense').reduce((sum, c) => sum + getEffectiveAmount(c), 0);
    return { income, expenses, balance: income - expenses };
  }, [categories]);

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

  const deleteCategory = (id: string, name: string, type: CategoryType) => {
    const typeLabel = type === 'income' ? 'INGRESO' : 'GASTO';
    
    // Identificar todos los descendientes recursivamente
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

    const totalToDelete = idsToDelete.size;
    const message = `¿Deseas eliminar la categoría de ${typeLabel} "${name.toUpperCase()}"?${totalToDelete > 1 ? `\n\nEsto también borrará ${totalToDelete - 1} subcategorías asociadas.` : ''}\n\nEsta acción no se puede deshacer.`;

    if (confirm(message)) {
      setCategories(prev => prev
        .filter(c => !idsToDelete.has(c.id))
        .map(c => (c.sourceIncomeId && idsToDelete.has(c.sourceIncomeId) ? { ...c, sourceIncomeId: undefined } : c))
      );
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
    
    const usedFromIncome = cat.type === 'income' ? getIncomeUsage(cat.id) : 0;
    const incomeBalance = cat.type === 'income' ? amount - usedFromIncome : 0;

    return (
      <div key={cat.id} className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
        <div 
          className={`bg-white rounded-2xl p-4 border transition-all ${depth > 0 ? 'ml-6 border-l-4' : 'border-[#cfe7d9] shadow-sm hover:shadow-md'}`}
          style={{ borderLeftColor: depth > 0 ? cat.color : undefined }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div 
                className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
              >
                <span className="material-symbols-outlined text-xl">{cat.icon}</span>
              </div>
              <div className="truncate">
                <span className="font-bold text-[#0d1b13] block truncate text-sm">{cat.name}</span>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {cat.parentId ? 'Sub-Registro' : 'Principal'} • {cat.type === 'income' ? 'Meta' : 'Tope'}: {formatValue(cat.budget)}
                    </span>
                    {cat.type === 'expense' && cat.sourceIncomeId && (
                        <span className="text-[9px] font-black text-[#13ec6a] uppercase flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[10px]">account_balance_wallet</span>
                            Desde: {categories.find(c => c.id === cat.sourceIncomeId)?.name || 'General'}
                        </span>
                    )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                {hasChildren ? (
                  <span className="block font-black text-[#0d1b13] text-sm pr-2">{formatValue(amount)}</span>
                ) : (
                  <input 
                    type="number"
                    value={cat.amount || ''}
                    placeholder="0.00"
                    onChange={(e) => updateAmount(cat.id, Number(e.target.value))}
                    className="block w-20 text-right border-none bg-gray-50 rounded-lg p-1 text-sm font-black text-[#0d1b13] focus:ring-2 focus:ring-[#13ec6a] transition-all"
                  />
                )}
                <span className={`text-[9px] font-black tracking-tighter ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                  {cat.type === 'income' ? `LIBRE: ${formatValue(incomeBalance)}` : (isOver ? 'SOBREPASADO' : 'ACTUAL')}
                </span>
              </div>
              
              {/* Controles de Acción Lateral */}
              <div className="flex flex-col gap-2 ml-1 border-l border-gray-100 pl-3">
                <button 
                  onClick={() => setIsAdding({ parentId: cat.id, type: cat.type })} 
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-[#13ec6a]/20 hover:text-[#13ec6a] transition-all active:scale-90"
                  title="Añadir nivel inferior"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                </button>
                <button 
                  onClick={() => deleteCategory(cat.id, cat.name, cat.type)} 
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"
                  title="Borrar permanentemente"
                >
                  <span className="material-symbols-outlined text-lg">delete_forever</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Barra de estado inferior */}
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
            <div 
                className={`h-full transition-all duration-1000 ease-out ${cat.type === 'income' ? 'bg-[#13ec6a]' : (isOver ? 'bg-red-500' : 'bg-[#0d1b13]')}`}
                style={{ 
                    width: cat.type === 'income' 
                        ? `${Math.max(0, Math.min((incomeBalance / (amount || 1)) * 100, 100))}%` 
                        : `${Math.min((amount / (cat.budget || 1)) * 100, 100)}%` 
                }}
            ></div>
          </div>
        </div>
        {children.map(child => renderCategoryRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] pb-20 selection:bg-[#13ec6a] selection:text-[#0d1b13]">
      <div className="max-w-md mx-auto bg-[#f6f8f7] shadow-xl min-h-screen flex flex-col">
        
        <header className="px-6 pt-10 pb-4 flex items-center justify-between sticky top-0 bg-[#f6f8f7]/90 backdrop-blur-md z-30">
          <div className="flex items-center gap-2">
            <div className="bg-[#0d1b13] p-1.5 rounded-lg shadow-lg">
                <span className="material-symbols-outlined text-white text-xl">account_balance</span>
            </div>
            <h1 className="text-xl font-black text-[#0d1b13] tracking-tight italic">FinanceFlow Pro</h1>
          </div>
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
            className="bg-white border-[#cfe7d9] text-[#0d1b13] font-bold text-xs rounded-full py-1.5 px-4 shadow-sm focus:ring-2 focus:ring-[#13ec6a] outline-none"
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </header>

        <main className="px-5 flex flex-col gap-6 mt-4">
          
          {/* Dashboard Resumen */}
          <div className="bg-[#0d1b13] rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-40 h-40 bg-[#13ec6a] rounded-full blur-[90px] opacity-20 transition-all"></div>
             <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tu Salud Financiera</p>
             <h2 className={`text-4xl font-black mb-7 transition-colors ${totals.balance >= 0 ? 'text-[#13ec6a]' : 'text-red-400'}`}>
                {formatValue(totals.balance)}
             </h2>
             
             <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-1.5 text-[#13ec6a]">
                      <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">Entradas</span>
                   </div>
                   <span className="text-lg font-bold">{formatValue(totals.income)}</span>
                </div>
                <div className="flex flex-col gap-1 border-l border-white/10 pl-5">
                   <div className="flex items-center gap-1.5 text-red-400">
                      <span className="material-symbols-outlined text-sm font-bold">trending_down</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">Salidas</span>
                   </div>
                   <span className="text-lg font-bold">{formatValue(totals.expenses)}</span>
                </div>
             </div>
          </div>

          {/* Gráfico y Selector de Modos */}
          <div className="bg-white rounded-[2rem] p-6 border border-[#cfe7d9] shadow-sm">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
                 <button 
                  onClick={() => setActiveTab('income')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'income' ? 'bg-white text-[#0d1b13] shadow-md' : 'text-gray-400 hover:text-gray-500'}`}
                 >
                   <span className="material-symbols-outlined text-sm">payments</span>
                   Ingresos
                 </button>
                 <button 
                  onClick={() => setActiveTab('expense')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'expense' ? 'bg-white text-[#0d1b13] shadow-md' : 'text-gray-400 hover:text-gray-500'}`}
                 >
                   <span className="material-symbols-outlined text-sm">shopping_bag</span>
                   Gastos
                 </button>
            </div>
            
            <div className="flex items-center gap-6 h-36">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
                 {chartData.slice(0, 3).map((item, i) => (
                   <div key={i} className="flex items-center justify-between text-[11px] font-black">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: item.color}}></div>
                        <span className="text-gray-500 truncate">{item.name}</span>
                      </div>
                      <span className="text-[#0d1b13]">{Math.round((item.value / (activeTab === 'income' ? totals.income : totals.expenses || 1)) * 100)}%</span>
                   </div>
                 ))}
                 {chartData.length > 3 && <p className="text-[10px] text-gray-300 font-bold italic pl-4">+ {chartData.length - 3} adicionales</p>}
              </div>
            </div>
          </div>

          {/* Sección Principal de Contenido */}
          <section className="flex flex-col gap-5">
            <div className="flex justify-between items-end px-1">
              <div>
                <h3 className="text-xl font-black text-[#0d1b13]">
                  {activeTab === 'income' ? 'Estructura de Ingresos' : 'Plan de Gastos'}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edición en tiempo real</p>
              </div>
              <button 
                onClick={() => setIsAdding({ parentId: null, type: activeTab })}
                className="bg-[#13ec6a] text-[#0d1b13] px-4 py-2.5 rounded-xl font-black text-xs shadow-[0_8px_20px_-5px_rgba(19,236,106,0.4)] active:scale-95 transition-all flex items-center gap-2 hover:bg-[#00d655]"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Añadir
              </button>
            </div>

            {/* Modal dinámico de creación */}
            {isAdding && (
              <div className="bg-white border-2 border-[#13ec6a] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300 flex flex-col gap-4 relative">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-[#0d1b13] uppercase">
                    {isAdding.parentId ? 'Nueva Subcategoría' : 'Nueva Categoría Raíz'}
                  </h4>
                  <button onClick={() => setIsAdding(null)} className="text-gray-300 hover:text-red-500">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                   <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nombre</label>
                      <input 
                        autoFocus
                        placeholder="Ej: Inversiones"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl text-sm p-3 focus:ring-2 focus:ring-[#13ec6a] font-bold"
                      />
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">{activeTab === 'income' ? "Monto Esperado" : "Presupuesto Asignado"}</label>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={newBudget || ''}
                        onChange={e => setNewBudget(Number(e.target.value))}
                        className="bg-gray-50 border-none rounded-xl text-sm p-3 focus:ring-2 focus:ring-[#13ec6a] font-bold"
                      />
                   </div>
                </div>

                {isAdding.type === 'expense' && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Vincular a Fuente</label>
                        <select 
                            value={selectedSourceId}
                            onChange={e => setSelectedSourceId(e.target.value)}
                            className="bg-gray-50 border-none rounded-xl text-xs p-3 focus:ring-2 focus:ring-[#13ec6a] font-bold"
                        >
                            <option value="">Fondo Común</option>
                            {incomeSources.map(source => (
                                <option key={source.id} value={source.id}>
                                    {source.name} ({formatValue(getEffectiveAmount(source) - getIncomeUsage(source.id))} disponible)
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button onClick={handleAddCategory} className="w-full bg-[#0d1b13] text-[#13ec6a] py-3.5 rounded-2xl text-xs font-black shadow-lg hover:shadow-xl transition-all mt-2">
                  Guardar Registro
                </button>
              </div>
            )}

            {/* Listado de Categorías Recursivo */}
            <div className="flex flex-col gap-5 pb-16">
              {categories.filter(c => c.parentId === null && c.type === activeTab).length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-25 text-center grayscale">
                    <span className="material-symbols-outlined text-6xl mb-3">folder_open</span>
                    <p className="font-bold text-sm leading-relaxed">Sin registros en esta pestaña.<br/>Presiona "Añadir" para comenzar.</p>
                </div>
              ) : (
                categories
                  .filter(c => c.parentId === null && c.type === activeTab)
                  .map(cat => renderCategoryRow(cat))
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default App;
