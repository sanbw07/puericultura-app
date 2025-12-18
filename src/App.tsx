import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar, Search, Clock, Baby, CheckCircle2, AlertCircle, CalendarDays, 
  Phone, Plus, Trash2, X, UserCheck, Bell, Utensils, AlertTriangle, 
  User, Edit2, ArrowRight, Upload, FileSpreadsheet, LogIn, Lock, Mail, LogOut, UserPlus 
} from 'lucide-react';

// --- Estilos Globais e Animações ---
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

* {
  font-family: 'Poppins', sans-serif;
}

body {
  background-color: #ffffff;
  margin: 0;
  color: #1e293b;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-soft {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

.animate-pulse-soft {
  animation: pulse-soft 3s infinite ease-in-out;
}

input:focus {
  outline: none;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #f8fafc;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
`;

// --- Tipos ---
type UserData = {
  email: string;
  password: string;
};

type Patient = {
  id: string;
  name: string;
  guardianName?: string;
  birthDate: string; // YYYY-MM-DD
  phone: string;
  lastCheckIn?: string; // ISO Date string (YYYY-MM-DD)
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

// --- Componente de Autenticação (Login e Cadastro) ---
const AuthScreen = ({ 
  onLogin, 
  registeredUsers, 
  setRegisteredUsers 
}: { 
  onLogin: () => void, 
  registeredUsers: UserData[], 
  setRegisteredUsers: (users: UserData[]) => void 
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegistering) {
      if (email.length < 5 || password.length < 4) {
        setError('E-mail ou senha muito curtos.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      if (registeredUsers.find(u => u.email === email)) {
        setError('Este e-mail já está cadastrado.');
        return;
      }

      const newUser = { email, password };
      setRegisteredUsers([...registeredUsers, newUser]);
      setSuccess('Conta criada com sucesso! Faça o login agora.');
      setIsRegistering(false);
      setPassword('');
      setConfirmPassword('');
    } else {
      const user = registeredUsers.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin();
      } else {
        setError('E-mail ou senha incorretos.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        <div className="bg-slate-800 p-10 text-center text-white transition-all">
          <div className="inline-flex bg-white/10 p-4 rounded-2xl mb-4 backdrop-blur-sm border border-white/20">
            <Baby size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Puericultura Pro</h2>
          <p className="text-slate-400 text-sm mt-1 font-light">
            {isRegistering ? 'Crie sua conta administrativa' : 'Gerenciamento Clínico Restrito'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-center animate-fade-in">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-4 rounded-2xl flex items-center animate-fade-in">
              <CheckCircle2 size={16} className="mr-2 flex-shrink-0" /> {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="E-mail"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-400 focus:bg-white transition-all text-slate-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Senha"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-400 focus:bg-white transition-all text-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {isRegistering && (
              <div className="relative group animate-fade-in">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Confirme a senha"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-400 focus:bg-white transition-all text-slate-700"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center mt-2"
          >
            {isRegistering ? (
              <>Cadastrar <UserPlus size={20} className="ml-2" /></>
            ) : (
              <>Entrar <LogIn size={20} className="ml-2" /></>
            )}
          </button>

          <div className="pt-6 border-t border-slate-100 text-center">
            <button 
              type="button" 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors"
            >
              {isRegistering ? 'Já possui conta? Faça login' : 'Ainda não tem conta? Registre-se'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Componente Principal ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // --- Inicialização com LocalStorage ---
  
  // Usuários (Lê do localStorage ou inicia com admin)
  const [registeredUsers, setRegisteredUsers] = useState<UserData[]>(() => {
    const saved = localStorage.getItem('puericultura_users');
    return saved ? JSON.parse(saved) : [{ email: 'admin@clinica.com', password: 'admin' }];
  });

  // Pacientes (Lê do localStorage ou inicia vazio)
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('puericultura_patients');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Efeitos de Persistência ---

  useEffect(() => {
    localStorage.setItem('puericultura_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('puericultura_patients', JSON.stringify(patients));
  }, [patients]);

  const [filter, setFilter] = useState<'todos' | '0-12' | '12+' | 'atrasados' | 'intro-alim'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, patientId: string | null, patientName: string}>({ show: false, patientId: null, patientName: '' });
  const [checkInModal, setCheckInModal] = useState<{show: boolean, patientId: string | null, date: string}>({ show: false, patientId: null, date: '' });

  // Formulários
  const [newPatient, setNewPatient] = useState({ name: '', guardianName: '', phone: '', birthDate: '' });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hoje (Fixado para consistência de demonstração)
  const today = new Date(2025, 11, 18); 
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);

    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      clearTimeout(timer);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // --- Funções Auxiliares ---
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

  const checkInIsCurrent = (lastCheckIn?: string) => {
    if (!lastCheckIn) return false;
    const checkInDate = new Date(lastCheckIn);
    return checkInDate.getMonth() === today.getMonth() && checkInDate.getFullYear() === today.getFullYear();
  };

  // --- Handlers de Ação ---
  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.birthDate) return;
    const id = Math.random().toString(36).substr(2, 9);
    setPatients([...patients, { ...newPatient, id }]);
    setNewPatient({ name: '', guardianName: '', phone: '', birthDate: '' });
    setShowAddModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      reader.onload = (evt) => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) return;
        try {
          const workbook = XLSX.read(evt.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          processImportData(jsonData);
        } catch (e) { alert("Erro ao ler Excel."); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (evt) => {
        const lines = (evt.target?.result as string).split(/\r?\n/).map(l => l.split(','));
        processImportData(lines);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const processImportData = (rows: any[][]) => {
    if (rows.length < 2) return;
    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const idxName = headers.findIndex(h => h.includes('paciente') || h.includes('nome'));
    const idxBirth = headers.findIndex(h => h.includes('nascimento') || h.includes('data'));
    const idxPhone = headers.findIndex(h => h.includes('celular') || h.includes('telefone'));
    const idxGuardian = headers.findIndex(h => h.includes('respons') || h.includes('mae'));
    
    if (idxName === -1 || idxBirth === -1) { alert("Cabeçalho não reconhecido."); return; }
    
    const entries: Patient[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[idxName]) continue;
      let birth = String(row[idxBirth]);
      if (birth.match(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/)) {
        const p = birth.split(/[\/-]/);
        birth = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      entries.push({
        id: Math.random().toString(36).substr(2, 9),
        name: String(row[idxName]),
        birthDate: birth,
        phone: idxPhone !== -1 ? String(row[idxPhone]) : '',
        guardianName: idxGuardian !== -1 ? String(row[idxGuardian]) : ''
      });
    }
    setPatients(p => [...p, ...entries]);
  };

  const handleConfirmCheckIn = () => {
    if (checkInModal.patientId && checkInModal.date) {
      setPatients(patients.map(p => {
        if (p.id === checkInModal.patientId) return { ...p, lastCheckIn: checkInModal.date };
        return p;
      }));
      setCheckInModal({ show: false, patientId: null, date: '' });
    }
  };

  const handleUndoCheckIn = (id: string) => {
    if(confirm("Deseja remover o check-in?")) {
      setPatients(patients.map(p => {
        if (p.id === id) return { ...p, lastCheckIn: undefined };
        return p;
      }));
    }
  };

  const handleDeleteConfirmed = () => {
    if (deleteModal.patientId) {
      setPatients(patients.filter(p => p.id !== deleteModal.patientId));
      setDeleteModal({ show: false, patientId: null, patientName: '' });
    }
  };

  const processedData = useMemo(() => {
    return patients.map(p => {
      const { months, text } = calculateAge(p.birthDate);
      const { date: nextDueDate, rule } = calculateNextDue(p.birthDate, months);
      const status = getStatus(nextDueDate);
      const isCheckedInThisMonth = checkInIsCurrent(p.lastCheckIn);
      const birth = new Date(p.birthDate);
      const ageAtNextVisit = (nextDueDate.getFullYear() - birth.getFullYear()) * 12 + (nextDueDate.getMonth() - birth.getMonth());
      return { 
        ...p, 
        ageString: text, 
        ageMonths: months, 
        nextDueDate, 
        rule, 
        status, 
        isCheckedInThisMonth, 
        isSixMonthVisit: ageAtNextVisit === 6 
      } as ComputedPatient;
    })
    .filter(p => {
      const s = searchTerm.toLowerCase();
      if (!(p.name.toLowerCase().includes(s) || p.guardianName?.toLowerCase().includes(s))) return false;
      if (filter === '0-12') return p.ageMonths < 12;
      if (filter === '12+') return p.ageMonths >= 12;
      if (filter === 'atrasados') return p.status === 'atrasado' && !p.isCheckedInThisMonth;
      if (filter === 'intro-alim') return p.isSixMonthVisit && !p.isCheckedInThisMonth;
      return true;
    })
    .sort((a, b) => a.isCheckedInThisMonth === b.isCheckedInThisMonth ? a.nextDueDate.getTime() - b.nextDueDate.getTime() : (a.isCheckedInThisMonth ? 1 : -1));
  }, [patients, filter, searchTerm, today]);

  // --- Views ---
  if (showSplash) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <style>{styles}</style>
        <div className="bg-white p-10 rounded-full shadow-xl mb-6 animate-pulse-soft border-4 border-slate-100">
          <Baby size={80} className="text-slate-800" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 animate-fade-in tracking-tight">Puericultura</h1>
        <p className="text-slate-400 mt-2 text-lg animate-fade-in font-medium">Gestão Profissional</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <style>{styles}</style>
        <AuthScreen 
          onLogin={() => setIsLoggedIn(true)} 
          registeredUsers={registeredUsers}
          setRegisteredUsers={setRegisteredUsers}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      <style>{styles}</style>
      <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-800 p-2.5 rounded-xl text-white shadow-md">
              <Baby size={28} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none">Painel Clínico</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Status do Consultório</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-ins do Mês</span>
              <span className="text-xl font-bold text-emerald-600 leading-none">
                {processedData.filter(p => p.isCheckedInThisMonth).length}
              </span>
            </div>
            
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Encerrar Sessão"
            >
              <LogOut size={24} />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center shadow-lg transition-all active:scale-95"
            >
              <Plus size={20} className="mr-2" /> Novo Bebê
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        
        {/* Widgets de Estatística */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><User size={24}/></div>
            <div><p className="text-xs text-slate-500 font-medium">Cadastros</p><p className="text-xl font-bold">{patients.length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><CheckCircle2 size={24}/></div>
            <div><p className="text-xs text-slate-500 font-medium">Finalizados</p><p className="text-xl font-bold text-emerald-600">{processedData.filter(p => p.isCheckedInThisMonth).length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><Utensils size={24}/></div>
            <div><p className="text-xs text-slate-500 font-medium">Intro Alim.</p><p className="text-xl font-bold">{processedData.filter(p => p.isSixMonthVisit && !p.isCheckedInThisMonth).length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600"><AlertCircle size={24}/></div>
            <div><p className="text-xs text-slate-500 font-medium">Atrasados</p><p className="text-xl font-bold text-red-600">{processedData.filter(p => p.status === 'atrasado' && !p.isCheckedInThisMonth).length}</p></div>
          </div>
        </div>

        {/* Controles do Dashboard */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-700 placeholder-slate-400 focus:border-slate-400 shadow-sm"
              placeholder="Nome ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto pb-2 lg:pb-0 gap-2 w-full lg:w-auto">
            <button onClick={() => setFilter('todos')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter === 'todos' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Todos</button>
            <button onClick={() => setFilter('0-12')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter === '0-12' ? 'bg-slate-200 text-slate-800' : 'bg-white border border-slate-200 text-slate-600'}`}>Bebês</button>
            <button onClick={() => setFilter('12+')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter === '12+' ? 'bg-slate-200 text-slate-800' : 'bg-white border border-slate-200 text-slate-600'}`}>1+ Ano</button>
            <button onClick={() => setFilter('intro-alim')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter === 'intro-alim' ? 'bg-orange-100 text-orange-700' : 'bg-white border border-slate-200 text-slate-600'}`}>IA</button>
            <button onClick={() => setFilter('atrasados')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter === 'atrasados' ? 'bg-red-100 text-red-700' : 'bg-white border border-slate-200 text-slate-600'}`}>Atrasados</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center ml-2 hover:bg-emerald-100 transition-colors">
              <FileSpreadsheet size={18} className="mr-2" /> Planilha
            </button>
          </div>
        </div>

        {/* Grid de Pacientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedData.map((patient) => (
            <div 
              key={patient.id} 
              className={`bg-white rounded-3xl border border-slate-200 p-6 transition-all relative overflow-hidden group shadow-sm hover:shadow-lg ${patient.isCheckedInThisMonth ? 'bg-slate-50/50 grayscale-[0.5]' : ''}`}
            >
              {patient.isCheckedInThisMonth && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl">FINALIZADO</div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-2xl ${patient.isCheckedInThisMonth ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-800'}`}>
                  {patient.isCheckedInThisMonth ? <CheckCircle2 size={24} /> : <Baby size={24} />}
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setCheckInModal({show:true, patientId:patient.id, date:todayStr})} className="p-2 text-slate-400 hover:text-slate-800 transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => setDeleteModal({show: true, patientId: patient.id, patientName: patient.name})} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>

              <h3 className={`text-lg font-bold leading-tight truncate ${patient.isCheckedInThisMonth ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{patient.name}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">{patient.guardianName || 'Responsável não informado'}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">{patient.ageString}</span>
                <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${patient.rule === 'Mensal' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{patient.rule}</span>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Agenda Retorno</p>
                  <p className={`text-sm font-bold mt-0.5 ${patient.isCheckedInThisMonth ? 'text-emerald-500' : patient.status === 'atrasado' ? 'text-red-600' : 'text-slate-700'}`}>
                    {patient.isCheckedInThisMonth ? 'Concluído' : new Date(patient.nextDueDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                  </p>
                </div>
                {!patient.isCheckedInThisMonth ? (
                  <button 
                    onClick={() => setCheckInModal({show:true, patientId:patient.id, date:todayStr})}
                    className="bg-slate-800 text-white p-3 rounded-2xl hover:bg-slate-900 transition-all active:scale-90 shadow-md"
                  >
                    <UserCheck size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUndoCheckIn(patient.id)}
                    className="bg-slate-200 text-slate-500 p-3 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {!patient.isCheckedInThisMonth && patient.isSixMonthVisit && (
                <div className="mt-4 bg-orange-50 border border-orange-100 p-4 rounded-2xl animate-pulse">
                  <div className="flex items-center text-orange-700 text-[10px] font-bold uppercase mb-1">
                    <Utensils size={14} className="mr-1.5"/> IA (6 Meses)
                  </div>
                  <p className="text-[10px] text-orange-600 font-medium leading-tight">Lembrete: Paciente deve trazer fruta para esta consulta.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {processedData.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm mt-8 border-dashed">
            <Baby size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Consultório vazio</h3>
            <p className="text-sm text-slate-300">Cadastre o primeiro paciente ou importe sua planilha acima.</p>
          </div>
        )}
      </main>

      {/* --- Modais --- */}

      {checkInModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-fade-in border border-slate-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-slate-100 p-3 rounded-2xl text-slate-800"><Calendar size={24}/></div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Data do Atendimento</h3>
            </div>
            <input 
              type="date" 
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-800 outline-none mb-8 text-slate-700 font-bold"
              value={checkInModal.date}
              onChange={(e) => setCheckInModal({...checkInModal, date: e.target.value})}
            />
            <div className="flex gap-3">
              <button onClick={() => setCheckInModal({show:false, patientId:null, date:''})} className="flex-1 py-3.5 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
              <button onClick={handleConfirmCheckIn} className="flex-1 py-3.5 bg-slate-800 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-800 tracking-tight">Novo Cadastro</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Nome do Bebê</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-800 outline-none text-slate-700 font-medium"
                  placeholder="Nome completo..."
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Responsável</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-800 outline-none text-slate-700 font-medium"
                  placeholder="Ex: Mãe ou Pai"
                  value={newPatient.guardianName}
                  onChange={(e) => setNewPatient({...newPatient, guardianName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Nascimento</label>
                  <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-800 outline-none text-slate-700" value={newPatient.birthDate} onChange={(e) => setNewPatient({...newPatient, birthDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">WhatsApp</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-slate-800 outline-none text-slate-700" placeholder="66 9..." value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-3 border-t">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-3.5 text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
              <button onClick={handleAddPatient} className="px-8 py-3.5 bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm"><AlertTriangle size={32}/></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Remover Bebê?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Confirmar exclusão de <strong>{deleteModal.patientName}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({show:false, patientId:null, patientName:''})} className="flex-1 py-3.5 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Não</button>
              <button onClick={handleDeleteConfirmed} className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95">Sim, Remover</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}