import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar, Search, Clock, Baby, CheckCircle2, AlertCircle, 
  CalendarDays, Phone, Plus, Trash2, X, UserCheck, Bell, 
  Utensils, AlertTriangle, User, Edit2, ArrowRight, 
  FileSpreadsheet, LogOut, Lock 
} from 'lucide-react';

/**
 * PuericulturaApp - Sistema de Gestão de Consultas Pediátricas
 * Funcionalidades:
 * - Login com persistência
 * - Banco de dados local (LocalStorage)
 * - Importação de Excel/CSV (SheetJS)
 * - Cálculo automático de idade e próximas consultas
 * - Alertas de Introdução Alimentar (6 meses)
 */

// --- Estilos Globais e Animações ---
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

* {
  font-family: 'Poppins', sans-serif;
}

body {
  background-color: #f8fafc;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-soft {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.animate-pulse-soft {
  animation: pulse-soft 3s infinite ease-in-out;
}

/* Custom Scrollbar para uma UI mais limpa */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
`;

export default function App() {
  // --- Estados de Autenticação ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- Estados do Aplicativo ---
  const [showSplash, setShowSplash] = useState(true);
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, patientId: null, patientName: '' });
  const [checkInModal, setCheckInModal] = useState({ show: false, patientId: null, date: '' });
  
  // Formulário
  const [newPatient, setNewPatient] = useState({ name: '', guardianName: '', phone: '', birthDate: '' });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Data de referência (Simulando dia de hoje para os cálculos de puericultura)
  const today = new Date(2025, 11, 18); // 18 de Dezembro de 2025
  const todayStr = today.toISOString().split('T')[0];

  // --- Ciclo de Vida e Persistência ---
  useEffect(() => {
    // 1. Verificar Login salvo
    const savedAuth = localStorage.getItem('pueri_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);

    // 2. Carregar Pacientes salvos
    const savedPatients = localStorage.getItem('pueri_patients');
    if (savedPatients) {
      try {
        setPatients(JSON.parse(savedPatients));
      } catch (e) {
        console.error("Erro ao carregar dados locais", e);
      }
    }

    // 3. Script para Excel (SheetJS)
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);

    // 4. Timer do Splash Screen
    const timer = setTimeout(() => setShowSplash(false), 2000);

    return () => clearTimeout(timer);
  }, []);

  // Salva pacientes automaticamente no LocalStorage
  useEffect(() => {
    localStorage.setItem('pueri_patients', JSON.stringify(patients));
  }, [patients]);

  // --- Funções de Autenticação ---
  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    // Simulação de delay de rede
    setTimeout(() => {
      if (loginData.email === 'admin@puericultura.com' && loginData.password === '123456') {
        setIsAuthenticated(true);
        localStorage.setItem('pueri_auth', 'true');
      } else {
        setLoginError('E-mail ou senha incorretos.');
      }
      setIsLoggingIn(false);
    }, 1000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pueri_auth');
  };

  // --- Funções de Importação ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt: ProgressEvent<FileReader>) => {
      const data = evt.target?.result as ArrayBuffer | null;
      const XLSX = (window as any).XLSX;
      if (!XLSX) return alert("Biblioteca de Excel ainda carregando. Tente novamente.");
      if (!data) return alert("Erro ao ler arquivo.");
      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        processImportData(jsonData);
      } catch (err) {
        alert("Erro ao ler arquivo Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.currentTarget.value = ''; // Limpa o input de forma segura
  };

  const processImportData = (rows) => {
    if (rows.length < 2) return;
    const headers = rows[0].map(h => String(h).toLowerCase());
    
    const idxName = headers.findIndex(h => h.includes('nome') || h.includes('paciente'));
    const idxBirth = headers.findIndex(h => h.includes('nascimento') || h.includes('data'));
    const idxPhone = headers.findIndex(h => h.includes('tel') || h.includes('cel') || h.includes('contato'));
    const idxGuardian = headers.findIndex(h => h.includes('mae') || h.includes('pai') || h.includes('resp'));

    if (idxName === -1 || idxBirth === -1) {
      alert("Colunas 'Nome' e 'Nascimento' não encontradas.");
      return;
    }

    const newEntries = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[idxName] || !row[idxBirth]) continue;
      
      let birthDate = row[idxBirth];
      // Converte data serial do Excel se necessário
      if (typeof birthDate === 'number') {
        const d = new Date(Math.round((birthDate - 25569) * 86400 * 1000));
        birthDate = d.toISOString().split('T')[0];
      }

      newEntries.push({
        id: Math.random().toString(36).substr(2, 9),
        name: String(row[idxName]),
        birthDate: String(birthDate),
        phone: idxPhone !== -1 ? String(row[idxPhone] || '') : '',
        guardianName: idxGuardian !== -1 ? String(row[idxGuardian] || '') : ''
      });
    }

    setPatients(prev => [...prev, ...newEntries]);
    alert(`${newEntries.length} pacientes importados com sucesso!`);
  };

  // --- Regras de Negócio: Cálculos de Puericultura ---
  const calculateAge = (birthDateStr) => {
    const birth = new Date(birthDateStr);
    let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) months--;
    const years = Math.floor(Math.max(0, months) / 12);
    const remMonths = Math.max(0, months) % 12;
    return { months: Math.max(0, months), text: years > 0 ? `${years}a ${remMonths}m` : `${remMonths}m` };
  };

  const calculateNextDue = (birthDateStr, ageMonths) => {
    const birth = new Date(birthDateStr);
    let target = 0;
    // Lógica simplificada: Mensal até 1 ano, Trimestral depois
    while (true) {
      const d = new Date(birth.getFullYear(), birth.getMonth() + target, birth.getDate());
      if (d >= today) return { date: d, rule: target < 12 ? "Mensal" : "Trimestral" };
      target += (target < 12) ? 1 : 3;
    }
  };

  const processedData = useMemo(() => {
    return patients.map(p => {
      const { months, text } = calculateAge(p.birthDate);
      const { date, rule } = calculateNextDue(p.birthDate, months);
      
      // Check-in é considerado válido se for no mês/ano atual
      const isChecked = p.lastCheckIn?.startsWith(todayStr.substring(0, 7)) || false;
      
      const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      let status = 'em_dia';
      if (diffDays < 0) status = 'atrasado';
      else if (diffDays <= 7) status = 'proximo';
      else if (diffDays > 30) status = 'futuro';

      return {
        ...p, ageString: text, ageMonths: months, nextDueDate: date, rule,
        status,
        isCheckedInThisMonth: isChecked,
        isSixMonthVisit: months === 5 || months === 6 // Alerta de Intro Alimentar
      };
    })
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.guardianName?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filter === '0-12') return p.ageMonths < 12;
      if (filter === '12+') return p.ageMonths >= 12;
      if (filter === 'atrasados') return p.status === 'atrasado' && !p.isCheckedInThisMonth;
      if (filter === 'intro-alim') return p.isSixMonthVisit && !p.isCheckedInThisMonth;
      return true;
    })
    .sort((a, b) => Number(a.isCheckedInThisMonth) - Number(b.isCheckedInThisMonth) || (a.nextDueDate.getTime() - b.nextDueDate.getTime()));
  }, [patients, filter, searchTerm]);

  // --- Views ---

  if (showSplash) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <style>{styles}</style>
        <div className="bg-white p-10 rounded-full shadow-2xl mb-6 animate-pulse-soft border-4 border-blue-100 text-blue-600">
          <Baby size={80} />
        </div>
        <h1 className="text-4xl font-bold text-blue-900 tracking-tight animate-fade-in">Puericultura</h1>
        <p className="text-slate-400 mt-2 font-medium">Gestão Pediátrica Inteligente</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <style>{styles}</style>
        <div className="max-w-md w-full animate-fade-in">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500 mt-1 font-medium">Controle de Pacientes</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">E-mail</label>
                <input 
                  type="email" required 
                  className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@puericultura.com"
                  value={loginData.email}
                  onChange={e => setLoginData({...loginData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Senha</label>
                <input 
                  type="password" required
                  className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={e => setLoginData({...loginData, password: e.target.value})}
                />
              </div>
              {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}
              <button 
                type="submit" disabled={isLoggingIn}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
              >
                {isLoggingIn ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <style>{styles}</style>
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-100"><Baby size={24}/></div>
            <h1 className="text-xl font-bold tracking-tight">Puericultura</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleImportClick}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-all"
            >
              <FileSpreadsheet size={18} className="text-emerald-600" /> Importar Planilha
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={18}/> Novo
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Sair"><LogOut size={22}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Controles de Filtro */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="text" placeholder="Buscar por paciente ou responsável..."
              className="w-full pl-12 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'todos', label: 'TODOS', color: 'slate' },
              { id: '0-12', label: '0-12 M', color: 'blue' },
              { id: '12+', label: '1 ano+', color: 'indigo' },
              { id: 'intro-alim', label: 'INTRO. ALIM.', color: 'orange' },
              { id: 'atrasados', label: 'ATRASADOS', color: 'red' }
            ].map(f => (
              <button 
                key={f.id} onClick={() => setFilter(f.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-wider whitespace-nowrap border transition-all ${
                  filter === f.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Pacientes */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {processedData.map(p => (
              <div 
                key={p.id} 
                className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-slate-50/50 ${p.isCheckedInThisMonth ? 'bg-slate-50/70 opacity-60' : ''}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    p.isCheckedInThisMonth ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                    p.status === 'atrasado' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {p.isCheckedInThisMonth ? <CheckCircle2 size={28}/> : <Baby size={28}/>}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-lg text-slate-800 truncate ${p.isCheckedInThisMonth ? 'line-through decoration-slate-300' : ''}`}>
                      {p.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><User size={14} className="text-slate-400" /> {p.guardianName || 'Sem resp.'}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">{p.ageString}</span>
                      {p.isSixMonthVisit && !p.isCheckedInThisMonth && (
                        <span className="text-[9px] bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                          <Utensils size={10}/> INTRO. ALIMENTAR
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-10">
                  <div className="text-right">
                    <p className={`text-sm font-bold flex items-center justify-end gap-2 ${
                      p.isCheckedInThisMonth ? 'text-emerald-600' :
                      p.status === 'atrasado' ? 'text-red-600' : 'text-slate-700'
                    }`}>
                      {p.status === 'atrasado' && !p.isCheckedInThisMonth && <AlertCircle size={14}/>}
                      {p.isCheckedInThisMonth ? 'Atendido' : p.nextDueDate.toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.rule}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!p.isCheckedInThisMonth ? (
                      <button 
                        onClick={() => setCheckInModal({show: true, patientId: p.id, date: todayStr})}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <UserCheck size={16}/> Check-in
                      </button>
                    ) : (
                      <button 
                        onClick={() => setPatients(patients.map(item => item.id === p.id ? {...item, lastCheckIn: undefined} : item))}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-2 transition-colors"
                      >
                        Desfazer
                      </button>
                    )}
                    <button 
                      onClick={() => setDeleteModal({show: true, patientId: p.id, patientName: p.name})}
                      className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {processedData.length === 0 && (
              <div className="p-32 text-center">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Search size={32} className="text-slate-300"/>
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum paciente encontrado</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Cadastro */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 animate-fade-in shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Novo Paciente</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ana Julia" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsável</label>
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Maria (Mãe)" value={newPatient.guardianName} onChange={e => setNewPatient({...newPatient, guardianName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nascimento</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={newPatient.birthDate} onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="(66) 9..." value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button 
                  onClick={() => {
                    if(newPatient.name && newPatient.birthDate) {
                      setPatients([...patients, {...newPatient, id: Math.random().toString(36).substr(2, 9)}]);
                      setShowAddModal(false);
                      setNewPatient({name:'', guardianName:'', phone:'', birthDate:''});
                    }
                  }}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in */}
      {checkInModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center animate-fade-in border border-slate-100 shadow-2xl">
            <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-sm"><Calendar size={40}/></div>
            <h3 className="font-bold text-2xl text-slate-800 mb-2">Presença</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Selecione a data da consulta realizada:</p>
            <input 
              type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-8 font-bold text-center text-slate-700"
              value={checkInModal.date} onChange={e => setCheckInModal({...checkInModal, date: e.target.value})} 
            />
            <div className="flex gap-4">
              <button onClick={() => setCheckInModal({show: false, patientId: null, date: ''})} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl">Voltar</button>
              <button 
                onClick={() => {
                  setPatients(patients.map(p => p.id === checkInModal.patientId ? {...p, lastCheckIn: checkInModal.date} : p));
                  setCheckInModal({show: false, patientId: null, date: ''});
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletar */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center animate-fade-in shadow-2xl">
            <div className="bg-red-50 text-red-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm"><AlertTriangle size={40}/></div>
            <h3 className="font-bold text-2xl text-slate-800 mb-2">Excluir?</h3>
            <p className="text-slate-500 mb-8 text-sm font-medium">Deseja remover <b>{deleteModal.patientName}</b> permanentemente?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteModal({show: false, patientId: null, patientName: ''})} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl">Não</button>
              <button 
                onClick={() => {
                  setPatients(patients.filter(p => p.id !== deleteModal.patientId));
                  setDeleteModal({show: false, patientId: null, patientName: ''});
                }}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}