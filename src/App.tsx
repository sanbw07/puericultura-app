import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, Search, Clock, Baby, CheckCircle2, AlertCircle, CalendarDays, Phone, Plus, Trash2, X, UserCheck, Bell, Utensils, AlertTriangle, User, Edit2, ArrowRight, FileSpreadsheet, LogOut, Lock } from 'lucide-react';

// --- Estilos e Animações ---
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
* { font-family: 'Poppins', sans-serif; }
body { background-color: #f8fafc; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-soft { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
.animate-pulse-soft { animation: pulse-soft 3s infinite ease-in-out; }
`;

// --- Tipos ---
type Patient = {
  id: string;
  name: string;
  guardianName?: string;
  birthDate: string;
  phone: string;
  lastCheckIn?: string;
};

type ComputedPatient = Patient & {
  ageString: string;
  ageMonths: number;
  nextDueDate: Date;
  rule: string;
  status: 'atrasado' | 'proximo' | 'em_dia' | 'futuro';
  isCheckedInThisMonth: boolean;
  isSixMonthVisit: boolean;
};

export default function PuericulturaApp() {
  // --- Estados de Autenticação ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- Estados do App ---
  const [showSplash, setShowSplash] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filter, setFilter] = useState<'todos' | '0-12' | '12+' | 'atrasados' | 'intro-alim'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, patientId: string | null, patientName: string}>({ show: false, patientId: null, patientName: '' });
  const [checkInModal, setCheckInModal] = useState<{show: boolean, patientId: string | null, date: string}>({ show: false, patientId: null, date: '' });
  const [newPatient, setNewPatient] = useState({ name: '', guardianName: '', phone: '', birthDate: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date(2025, 11, 18); // Data simulada Dezembro 2025
  const todayStr = today.toISOString().split('T')[0];

  // --- Effects (LocalStorage) ---
  useEffect(() => {
    // 1. Carregar Autenticação
    const savedAuth = localStorage.getItem('pueri_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);

    // 2. Carregar Pacientes
    const savedPatients = localStorage.getItem('pueri_patients');
    if (savedPatients) setPatients(JSON.parse(savedPatients));

    // 3. Timer do Splash
    const timer = setTimeout(() => setShowSplash(false), 2000);

    // 4. Carregar SheetJS para Excel
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => clearTimeout(timer);
  }, []);

  // Salvar pacientes sempre que a lista mudar
  useEffect(() => {
    localStorage.setItem('pueri_patients', JSON.stringify(patients));
  }, [patients]);

  // --- Lógica de Login ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    setTimeout(() => {
      // Credenciais Padrão (Altere se necessário)
      if (loginData.email === 'admin@puericultura.com' && loginData.password === '123456') {
        setIsAuthenticated(true);
        localStorage.setItem('pueri_auth', 'true');
        setIsLoggingIn(false);
      } else {
        setLoginError('E-mail ou senha incorretos.');
        setIsLoggingIn(false);
      }
    }, 1000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pueri_auth');
  };

  // --- Helpers de Cálculo (Mantidos do original) ---
  const calculateAge = (birthDateStr: string) => {
    const birth = new Date(birthDateStr);
    let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) months--;
    if (months < 0) return { months: 0, text: "Recém-nascido" };
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    let text = years > 0 ? `${years}a ` : "";
    text += `${remainingMonths}m`;
    return { months, text };
  };

  const calculateNextDue = (birthDateStr: string, ageMonths: number): { date: Date, rule: string } => {
    const birth = new Date(birthDateStr);
    let nextDate = new Date(birth);
    let rule = "";
    if (ageMonths < 12) {
      let targetMonth = 0;
      while (true) {
        const d = new Date(birth.getFullYear(), birth.getMonth() + targetMonth, birth.getDate());
        if (d >= today) { nextDate = d; break; }
        targetMonth++;
      }
      rule = "Mensal";
    } else {
      let targetMonth = 12;
      while (true) {
        const d = new Date(birth.getFullYear(), birth.getMonth() + targetMonth, birth.getDate());
        if (d >= today) { nextDate = d; break; }
        targetMonth += 3;
      }
      rule = "Trimestral";
    }
    return { date: nextDate, rule };
  };

  const getStatus = (dueDate: Date): ComputedPatient['status'] => {
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'atrasado';
    if (diffDays <= 7) return 'proximo';
    if (diffDays <= 30) return 'em_dia';
    return 'futuro';
  };

  // --- Actions ---
  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.birthDate) return;
    const id = Math.random().toString(36).substr(2, 9);
    setPatients([...patients, { ...newPatient, id }]);
    setNewPatient({ name: '', guardianName: '', phone: '', birthDate: '' });
    setShowAddModal(false);
  };

  const handleDeleteConfirmed = () => {
    if (deleteModal.patientId) {
      setPatients(patients.filter(p => p.id !== deleteModal.patientId));
      setDeleteModal({ show: false, patientId: null, patientName: '' });
    }
  };

  const handleConfirmCheckIn = () => {
    if (checkInModal.patientId && checkInModal.date) {
      setPatients(patients.map(p => p.id === checkInModal.patientId ? { ...p, lastCheckIn: checkInModal.date } : p));
      setCheckInModal({ show: false, patientId: null, date: '' });
    }
  };

  // --- Processamento de Dados para Listagem ---
  const processedData = useMemo(() => {
    return patients.map(p => {
      const { months, text } = calculateAge(p.birthDate);
      const { date: nextDueDate, rule } = calculateNextDue(p.birthDate, months);
      const isCheckedInThisMonth = p.lastCheckIn ? (new Date(p.lastCheckIn).getMonth() === today.getMonth() && new Date(p.lastCheckIn).getFullYear() === today.getFullYear()) : false;
      const birth = new Date(p.birthDate);
      const ageAtNextVisit = (nextDueDate.getFullYear() - birth.getFullYear()) * 12 + (nextDueDate.getMonth() - birth.getMonth());

      return {
        ...p,
        ageString: text,
        ageMonths: months,
        nextDueDate,
        rule,
        status: getStatus(nextDueDate),
        isCheckedInThisMonth,
        isSixMonthVisit: ageAtNextVisit === 6
      } as ComputedPatient;
    })
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.guardianName?.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      if (filter === '0-12') return p.ageMonths < 12;
      if (filter === '12+') return p.ageMonths >= 12;
      if (filter === 'atrasados') return p.status === 'atrasado' && !p.isCheckedInThisMonth;
      if (filter === 'intro-alim') return p.isSixMonthVisit && !p.isCheckedInThisMonth;
      return true;
    })
    .sort((a, b) => Number(a.isCheckedInThisMonth) - Number(b.isCheckedInThisMonth) || a.nextDueDate.getTime() - b.nextDueDate.getTime());
  }, [patients, filter, searchTerm]);

  const stats = {
    total: patients.length,
    late: processedData.filter(p => p.status === 'atrasado' && !p.isCheckedInThisMonth).length,
    checkedIn: processedData.filter(p => p.isCheckedInThisMonth).length
  };

  // --- Views ---

  if (showSplash) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <style>{styles}</style>
        <div className="bg-white p-10 rounded-full shadow-xl mb-6 animate-pulse-soft border-4 border-blue-100 text-blue-600">
          <Baby size={80} />
        </div>
        <h1 className="text-4xl font-bold text-blue-900 animate-fade-in tracking-tight">Puericultura</h1>
        <p className="text-slate-500 mt-2 text-lg animate-fade-in font-medium">Gestão Profissional</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <style>{styles}</style>
        <div className="max-w-md w-full animate-fade-in">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-4"><Lock size={32} /></div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Login Clínico</h2>
            <p className="text-slate-500 mt-2 font-medium">Acesse o controle de pacientes</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">E-mail</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input type="email" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="admin@puericultura.com" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Senha</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input type="password" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
                </div>
              </div>
              {loginError && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium flex items-center gap-2"><AlertCircle size={16}/> {loginError}</div>}
              <button type="submit" disabled={isLoggingIn} className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                {isLoggingIn ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Entrar no Sistema <ArrowRight size={18}/></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      <style>{styles}</style>
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md"><Baby size={28} /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Puericultura</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Gestão de Consultas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Confirmados</span>
              <span className="text-xl font-bold text-emerald-600 leading-none">{stats.checkedIn}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Sair"><LogOut size={22} /></button>
            <button onClick={() => setShowAddModal(true)} className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center shadow-lg transition-all"><Plus size={20} className="mr-2" /> Novo</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input type="text" className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar paciente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex overflow-x-auto gap-2 w-full md:w-auto">
            {['todos', '0-12', '12+', 'intro-alim', 'atrasados'].map((f) => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {processedData.map((patient) => (
              <div key={patient.id} className={`flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 transition-all ${patient.isCheckedInThisMonth ? 'bg-slate-50/50 opacity-70' : 'hover:bg-blue-50/20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${patient.isCheckedInThisMonth ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {patient.isCheckedInThisMonth ? <CheckCircle2 size={24} /> : <Baby size={24} />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-slate-800 ${patient.isCheckedInThisMonth ? 'line-through' : ''}`}>{patient.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><User size={12}/> {patient.guardianName}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{patient.ageString}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                   <div className="text-right hidden md:block">
                      <div className={`text-sm font-bold ${patient.status === 'atrasado' && !patient.isCheckedInThisMonth ? 'text-red-600' : 'text-slate-700'}`}>
                        {patient.isCheckedInThisMonth ? 'Concluído' : patient.nextDueDate.toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{patient.rule}</div>
                   </div>
                   <div className="flex gap-2">
                     {!patient.isCheckedInThisMonth ? (
                        <button onClick={() => setCheckInModal({show: true, patientId: patient.id, date: todayStr})} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"><UserCheck size={16}/> Check-in</button>
                     ) : (
                        <button onClick={() => setPatients(patients.map(p => p.id === patient.id ? {...p, lastCheckIn: undefined} : p))} className="bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-lg text-xs font-bold">Desfazer</button>
                     )}
                     <button onClick={() => setDeleteModal({show: true, patientId: patient.id, patientName: patient.name})} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                   </div>
                </div>
              </div>
            ))}
            {processedData.length === 0 && <div className="p-20 text-center text-slate-400 font-medium">Nenhum paciente encontrado.</div>}
          </div>
        </div>
      </main>

      {/* Modals Simplificados */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl">Novo Cadastro</h3>
              <button onClick={() => setShowAddModal(false)}><X/></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" placeholder="Nome do Bebê" className="w-full p-3 bg-slate-50 border rounded-xl" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
              <input type="text" placeholder="Responsável" className="w-full p-3 bg-slate-50 border rounded-xl" value={newPatient.guardianName} onChange={e => setNewPatient({...newPatient, guardianName: e.target.value})} />
              <div className="flex gap-4">
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl" value={newPatient.birthDate} onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})} />
                <input type="text" placeholder="Whats" className="w-full p-3 bg-slate-50 border rounded-xl" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
              </div>
              <button onClick={handleAddPatient} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Salvar Paciente</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Check-in */}
      {checkInModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full animate-fade-in text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4"><Calendar size={32}/></div>
            <h3 className="font-bold text-xl mb-2">Confirmar Consulta</h3>
            <p className="text-sm text-slate-500 mb-6">Selecione a data em que o atendimento foi realizado:</p>
            <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl mb-6" value={checkInModal.date} onChange={e => setCheckInModal({...checkInModal, date: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={() => setCheckInModal({show: false, patientId: null, date: ''})} className="flex-1 py-3 text-slate-500 font-bold">Sair</button>
              <button onClick={handleConfirmCheckIn} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4"><AlertTriangle size={32}/></div>
            <h3 className="font-bold text-xl mb-2">Excluir?</h3>
            <p className="text-sm text-slate-500 mb-6">Deseja remover <b>{deleteModal.patientName}</b>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({show: false, patientId: null, patientName: ''})} className="flex-1 py-3 text-slate-500 font-bold">Não</button>
              <button onClick={handleDeleteConfirmed} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}