import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, Search, Clock, Baby, CheckCircle2, AlertCircle, CalendarDays, Phone, Plus, Trash2, X, UserCheck, Bell, Utensils, AlertTriangle, User, Edit2, ArrowRight, Upload, FileSpreadsheet } from 'lucide-react';

// --- Styles for Font (Poppins) & Animation ---
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

* {
  font-family: 'Poppins', sans-serif;
}

body {
  background-color: #f8fafc; /* Slate-50 */
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

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9; 
}
::-webkit-scrollbar-thumb {
  background: #94a3b8; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #64748b; 
}
`;

// --- Types ---
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

// --- Mock Data (Empty for Production) ---
const INITIAL_DATA: Patient[] = [];

export default function PuericulturaApp() {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_DATA);
  const [filter, setFilter] = useState<'todos' | '0-12' | '12+' | 'atrasados' | 'intro-alim'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, patientId: string | null, patientName: string}>({ show: false, patientId: null, patientName: '' });
  const [checkInModal, setCheckInModal] = useState<{show: boolean, patientId: string | null, date: string}>({ show: false, patientId: null, date: '' });

  // Forms
  const [newPatient, setNewPatient] = useState({ name: '', guardianName: '', phone: '', birthDate: '' });

  // Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data atual simulada (Dezembro 2025)
  const today = new Date(2025, 11, 17);
  const todayStr = today.toISOString().split('T')[0];

  // --- Effects ---
  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); 

    // Load SheetJS for Excel support dynamically
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      clearTimeout(timer);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // --- Helpers ---

  const calculateAge = (birthDateStr: string) => {
    const birth = new Date(birthDateStr);
    let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) months--;
    
    if (months < 0) return { months: 0, text: "Recém-nascido" };
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    let text = "";
    if (years > 0) text += `${years}a `;
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
        if (d >= today) {
          nextDate = d;
          break;
        }
        targetMonth++;
      }
      rule = "Mensal";
    } else {
      let targetMonth = 12;
      while (true) {
        const d = new Date(birth.getFullYear(), birth.getMonth() + targetMonth, birth.getDate());
        if (d >= today) {
          nextDate = d;
          break;
        }
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
    return checkInDate.getMonth() === today.getMonth() && 
           checkInDate.getFullYear() === today.getFullYear();
  };

  // --- Actions ---

  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.birthDate) return;
    const id = Math.random().toString(36).substr(2, 9);
    setPatients([...patients, { ...newPatient, id }]);
    setNewPatient({ name: '', guardianName: '', phone: '', birthDate: '' });
    setShowAddModal(false);
  };

  const confirmDelete = (patient: Patient) => {
    setDeleteModal({ show: true, patientId: patient.id, patientName: patient.name });
  };

  const handleDeleteConfirmed = () => {
    if (deleteModal.patientId) {
      setPatients(patients.filter(p => p.id !== deleteModal.patientId));
      setDeleteModal({ show: false, patientId: null, patientName: '' });
    }
  };

  const openCheckInModal = (patientId: string) => {
    setCheckInModal({ show: true, patientId, date: todayStr });
  };

  const handleConfirmCheckIn = () => {
    if (checkInModal.patientId && checkInModal.date) {
      setPatients(patients.map(p => {
        if (p.id === checkInModal.patientId) {
          return { ...p, lastCheckIn: checkInModal.date };
        }
        return p;
      }));
      setCheckInModal({ show: false, patientId: null, date: '' });
    }
  };

  const handleUndoCheckIn = (id: string) => {
    if(confirm("Deseja remover o registro da consulta deste mês?")) {
      setPatients(patients.map(p => {
        if (p.id === id) {
          return { ...p, lastCheckIn: undefined };
        }
        return p;
      }));
    }
  };

  // --- Import Logic ---

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      reader.onload = (evt) => {
        const data = evt.target?.result;
        if (!data) return;
        
        // Using dynamic XLSX from window
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
          alert("Biblioteca de Excel ainda carregando... Tente novamente em alguns segundos.");
          return;
        }

        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Convert to JSON (array of arrays to handle headers easily)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          processImportData(jsonData);
        } catch (error) {
          console.error(error);
          alert("Erro ao ler arquivo Excel. Verifique se o formato está correto.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV/Text fallback
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).map(line => line.split(','));
        processImportData(lines);
      };
      reader.readAsText(file);
    }

    // Reset input
    e.target.value = '';
  };

  const processImportData = (rows: any[][]) => {
    if (rows.length < 2) {
        alert("O arquivo parece estar vazio ou sem dados.");
        return;
    }

    // Headers - normalize to lowercase and remove extra spaces/quotes
    const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indexes
    const idxName = headers.findIndex(h => h.includes('paciente') || h.includes('nome'));
    const idxBirth = headers.findIndex(h => h.includes('nascimento') || h.includes('data'));
    const idxPhone = headers.findIndex(h => h.includes('celular') || h.includes('telefone') || h.includes('whatsapp') || h.includes('contato'));
    const idxGuardian = headers.findIndex(h => h.includes('respons') || h.includes('mae') || h.includes('pai'));

    if (idxName === -1 || idxBirth === -1) {
        alert("Erro: Não foi possível identificar as colunas 'Paciente' e 'Nascimento' no arquivo. Verifique o cabeçalho.");
        return;
    }

    const newEntries: Patient[] = [];
    let errors = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Ensure row has enough columns
        if (row.length <= Math.max(idxName, idxBirth)) continue;

        const name = String(row[idxName] || '').trim().replace(/^"|"$/g, '');
        let birthDateRaw = row[idxBirth];
        const phone = idxPhone !== -1 ? String(row[idxPhone] || '').trim().replace(/^"|"$/g, '') : '';
        const guardianName = idxGuardian !== -1 ? String(row[idxGuardian] || '').trim().replace(/^"|"$/g, '') : '';

        if (!name || !birthDateRaw) {
            continue;
        }

        // Handle Excel Date serial numbers (if it comes as number)
        let birthDate = '';
        if (typeof birthDateRaw === 'number') {
             // Excel date to JS Date approx conversion
             const date = new Date(Math.round((birthDateRaw - 25569)*86400*1000));
             birthDate = date.toISOString().split('T')[0];
        } else {
             // String handling
             birthDate = String(birthDateRaw).trim().replace(/^"|"$/g, '');
             // DD/MM/YYYY to YYYY-MM-DD
             if (birthDate.match(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/)) {
                const parts = birthDate.split(/[\/-]/);
                birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
             }
        }

        if (birthDate) {
            newEntries.push({
                id: Math.random().toString(36).substr(2, 9),
                name,
                birthDate,
                phone,
                guardianName
            });
        }
    }

    if (newEntries.length > 0) {
        setPatients(prev => [...prev, ...newEntries]);
        alert(`${newEntries.length} pacientes importados com sucesso!`);
    } else {
        alert("Nenhum paciente válido encontrado no arquivo.");
    }
  };

  // --- Processed Data ---
  
  const processedData = useMemo(() => {
    return patients.map(p => {
      const { months, text } = calculateAge(p.birthDate);
      const { date: nextDueDate, rule } = calculateNextDue(p.birthDate, months);
      const status = getStatus(nextDueDate);
      const isCheckedInThisMonth = checkInIsCurrent(p.lastCheckIn);
      
      const birth = new Date(p.birthDate);
      const ageAtNextVisit = (nextDueDate.getFullYear() - birth.getFullYear()) * 12 + (nextDueDate.getMonth() - birth.getMonth());
      const isSixMonthVisit = ageAtNextVisit === 6;
      
      return {
        ...p,
        ageString: text,
        ageMonths: months,
        nextDueDate,
        rule,
        status,
        isCheckedInThisMonth,
        isSixMonthVisit
      } as ComputedPatient;
    })
    .filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchLower) || 
                            (p.guardianName && p.guardianName.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;

      if (filter === '0-12') return p.ageMonths < 12;
      if (filter === '12+') return p.ageMonths >= 12;
      if (filter === 'atrasados') return p.status === 'atrasado' && !p.isCheckedInThisMonth;
      if (filter === 'intro-alim') return p.isSixMonthVisit && !p.isCheckedInThisMonth;
      return true;
    })
    .sort((a, b) => {
        if (a.isCheckedInThisMonth !== b.isCheckedInThisMonth) {
            return a.isCheckedInThisMonth ? 1 : -1;
        }
        return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    });
  }, [patients, filter, searchTerm, today]);

  const stats = {
    total: patients.length,
    dueThisWeek: processedData.filter(p => p.status === 'proximo' && !p.isCheckedInThisMonth).length,
    late: processedData.filter(p => p.status === 'atrasado' && !p.isCheckedInThisMonth).length,
    checkedIn: processedData.filter(p => p.isCheckedInThisMonth).length,
    introAlim: processedData.filter(p => p.isSixMonthVisit && !p.isCheckedInThisMonth).length
  };

  // --- Views ---

  if (showSplash) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <style>{styles}</style>
        <div className="bg-white p-10 rounded-full shadow-xl mb-6 animate-pulse-soft border-4 border-blue-100">
          <Baby size={80} className="text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-blue-900 animate-fade-in tracking-tight">Puericultura</h1>
        <p className="text-slate-500 mt-2 text-lg animate-fade-in font-medium" style={{animationDelay: '0.2s'}}>Gestão Profissional</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <style>{styles}</style>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept=".csv,.txt,.xlsx,.xls"
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-200">
              <Baby size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Puericultura</h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Controle Clínico</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-8">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmados</span>
              <span className="text-2xl font-bold text-emerald-600 leading-none">{stats.checkedIn}</span>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            
            <div className="relative group cursor-pointer">
                <Bell className={`text-slate-400 group-hover:text-blue-600 transition-colors ${stats.late > 0 ? 'animate-pulse text-red-500' : ''}`} size={26} />
                {stats.late > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                        {stats.late}
                    </span>
                )}
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={handleImportClick}
                    className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center shadow-sm transition-all"
                    title="Importar Excel ou CSV"
                >
                    <FileSpreadsheet size={20} className="mr-2 text-emerald-600" />
                    Importar
                </button>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={20} className="mr-2" />
                    Novo
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0 gap-4">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm shadow-sm transition-all"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 w-full md:w-auto px-1">
            <button onClick={() => setFilter('todos')} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === 'todos' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Todos</button>
            <button onClick={() => setFilter('0-12')} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === '0-12' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>0-12 Meses</button>
            <button onClick={() => setFilter('12+')} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === '12+' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>12+ Meses</button>
            
            <button onClick={() => setFilter('intro-alim')} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center transition-all ${filter === 'intro-alim' ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600'}`}>
                <Utensils size={16} className="mr-2" /> IA ({stats.introAlim})
            </button>
            
            <button onClick={() => setFilter('atrasados')} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center transition-all ${filter === 'atrasados' ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600'}`}>
                <AlertCircle size={16} className="mr-2" /> Atrasados
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="min-w-full divide-y divide-slate-100">
            <div className="bg-slate-50 grid grid-cols-1 md:grid-cols-12 gap-4 px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:grid">
              <div className="col-span-4">Paciente / Responsável</div>
              <div className="col-span-2">Frequência</div>
              <div className="col-span-3">Previsão</div>
              <div className="col-span-3 text-right">Ações</div>
            </div>

            <div className="divide-y divide-slate-100">
              {processedData.map((patient) => (
                <div key={patient.id} className={`grid grid-cols-1 md:grid-cols-12 gap-6 px-8 py-6 items-center transition-all duration-200 ${patient.isCheckedInThisMonth ? 'bg-slate-50 opacity-60' : 'hover:bg-blue-50/30'}`}>
                  
                  {/* Paciente */}
                  <div className="col-span-4 flex items-center">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 transition-colors border ${patient.isCheckedInThisMonth ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                      {patient.isCheckedInThisMonth ? <CheckCircle2 size={24} /> : <Baby size={24} />}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-base font-bold truncate ${patient.isCheckedInThisMonth ? 'text-emerald-700 line-through decoration-emerald-500/30' : 'text-slate-800'}`}>{patient.name}</div>
                      
                      {patient.guardianName && (
                        <div className="text-xs text-slate-500 flex items-center mt-1">
                          <User size={12} className="mr-1.5 text-slate-400" />
                          <span className="font-medium">{patient.guardianName}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium flex items-center"><Phone size={8} className="mr-1" />{patient.phone}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold">{patient.ageString}</span>
                      </div>
                    </div>
                  </div>

                  {/* Regra */}
                  <div className="col-span-2 hidden md:block">
                     <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border ${patient.rule === 'Mensal' ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                        {patient.rule === 'Mensal' ? <Clock size={12} className="mr-1.5"/> : <CalendarDays size={12} className="mr-1.5"/>}
                        {patient.rule}
                     </span>
                  </div>

                  {/* Próximo Agendamento */}
                  <div className="col-span-3">
                    <div className="flex items-start">
                      <div className={`mr-3 p-2 rounded-lg border hidden md:block ${
                        patient.isCheckedInThisMonth ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        patient.isSixMonthVisit ? 'bg-orange-50 border-orange-100 text-orange-600' :
                        patient.status === 'atrasado' ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' :
                        patient.status === 'proximo' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                        'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {patient.isSixMonthVisit && !patient.isCheckedInThisMonth ? <Utensils size={18} /> : <Calendar size={18} />}
                      </div>
                      <div>
                        {/* Status Principal */}
                        <div className={`text-sm font-bold ${
                           patient.isCheckedInThisMonth ? 'text-emerald-600' :
                           patient.status === 'atrasado' ? 'text-red-600' : 
                           patient.status === 'proximo' ? 'text-amber-600' : 'text-slate-700'
                        }`}>
                          {patient.isCheckedInThisMonth ? 'Confirmado' : patient.nextDueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </div>
                        
                        {/* Aviso de Última Consulta */}
                        {patient.isCheckedInThisMonth && patient.lastCheckIn && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                                Dia {new Date(patient.lastCheckIn).toLocaleDateString('pt-BR', { day: '2-digit' })}
                            </div>
                        )}

                        {/* Aviso de Intro Alimentar */}
                        {!patient.isCheckedInThisMonth && patient.isSixMonthVisit && (
                            <div className="mt-1 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-block">
                                <span className="text-[10px] text-orange-700 font-bold flex items-center">
                                    🍎 Intro. Alimentar
                                </span>
                                <span className="text-[9px] text-orange-600 block leading-tight mt-0.5">
                                    Trazer fruta
                                </span>
                            </div>
                        )}

                        <div className="text-[10px] text-slate-500 mt-1 font-medium">
                           {!patient.isCheckedInThisMonth && !patient.isSixMonthVisit && (
                                <>
                                    {patient.status === 'atrasado' && 'Atrasado!'}
                                    {patient.status === 'proximo' && 'Esta semana'}
                                    {patient.status === 'em_dia' && 'Este mês'}
                                    {patient.status === 'futuro' && 'Futuro'}
                                </>
                           )}
                           {/* Aviso para próxima consulta após check-in */}
                           {patient.isCheckedInThisMonth && (
                               <span className="text-slate-400 block mt-0.5">
                                   Retorno: {new Date(new Date(patient.nextDueDate).setMonth(patient.nextDueDate.getMonth() + 1)).toLocaleDateString('pt-BR', {month:'long'})}
                               </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="col-span-3 flex justify-end items-center gap-3">
                    {patient.isCheckedInThisMonth ? (
                         <div className="flex items-center gap-2">
                             <button 
                                onClick={() => openCheckInModal(patient.id)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                title="Editar data"
                             >
                                <Edit2 size={16} />
                             </button>
                             <button 
                                onClick={() => handleUndoCheckIn(patient.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                             >
                                Desfazer
                             </button>
                         </div>
                    ) : (
                        <button 
                            onClick={() => openCheckInModal(patient.id)}
                            className="flex items-center px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
                        >
                            <UserCheck size={16} className="mr-2" /> Check-in
                        </button>
                    )}

                    <button 
                        onClick={() => confirmDelete(patient)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                    >
                        <Trash2 size={18} />
                    </button>
                  </div>

                </div>
              ))}
              
              {processedData.length === 0 && (
                <div className="py-20 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Search className="text-slate-300" size={32}/>
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum paciente encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-100">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Remover Paciente?</h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        Tem certeza que deseja remover <strong>{deleteModal.patientName}</strong>? <br/>Essa ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setDeleteModal({show: false, patientId: null, patientName: ''})} 
                            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDeleteConfirmed} 
                            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-100 transition-all"
                        >
                            Sim, Remover
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Check-in Date Modal */}
      {checkInModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
                <div className="p-8">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="bg-blue-50 p-3 rounded-xl text-blue-600 border border-blue-100">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Confirmar Presença</h3>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                        Qual foi a data da consulta realizada?
                    </p>

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Data da Consulta</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 font-medium bg-white"
                            value={checkInModal.date}
                            onChange={(e) => setCheckInModal({...checkInModal, date: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setCheckInModal({show: false, patientId: null, date: ''})} 
                            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmCheckIn} 
                            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-100 flex items-center transition-all"
                        >
                            Confirmar <ArrowRight size={18} className="ml-2" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-xl text-slate-800">Novo Paciente</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Nome Completo do Bebê</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 bg-white placeholder-slate-400"
                            placeholder="Ex: Ana Clara"
                            value={newPatient.name}
                            onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Nome do Responsável</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 bg-white placeholder-slate-400"
                            placeholder="Ex: Maria Silva (Mãe)"
                            value={newPatient.guardianName}
                            onChange={e => setNewPatient({...newPatient, guardianName: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Nascimento</label>
                            <input 
                                type="date" 
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                                value={newPatient.birthDate}
                                onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Whatsapp</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 bg-white placeholder-slate-400"
                                placeholder="66 9999-9999"
                                value={newPatient.phone}
                                onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
                <div className="px-8 py-6 bg-slate-50/50 flex justify-end gap-3 border-t border-slate-100">
                    <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-white rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleAddPatient} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-100 transition-all transform hover:scale-105">Salvar Cadastro</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}