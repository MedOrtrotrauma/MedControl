import { useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LogOut,
  Menu,
  Settings2,
  Stethoscope,
  UserRound,
  UsersRound,
  Users,
  X,
  ShieldCheck,
} from 'lucide-react';
import { RepasseComponent } from './components/Repasse';
import { RelatoriosComponent } from './components/Relatorios';
import { MedicosCadastro } from './components/Cadastros/MedicosCadastro';
import { ConveniosCadastro } from './components/Cadastros/ConveniosCadastro';
import { HospitaisCadastro } from './components/Cadastros/HospitaisCadastro';
import { UnidadesCadastro } from './components/Cadastros/UnidadesCadastro';
import { ProcedimentosCadastro } from './components/Cadastros/ProcedimentosCadastro';
import { UsuariosCadastro } from './components/Cadastros/UsuariosCadastro';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import type { TipoUsuario } from './components/Auth/AuthContext';

type Page = 'repasse_terceiros' | 'repasse_socios' | 'relatorios' | 'medicos' | 'convenios' | 'hospitais' | 'unidades' | 'procedimentos' | 'usuarios';

interface MenuItem { id: Page; label: string; icon: typeof BarChart3; }
interface MenuGroup { label: string; icon: typeof BarChart3; items: MenuItem[]; roles: TipoUsuario[]; }

const menuGroups: MenuGroup[] = [
  {
    label: 'Repasse médico', icon: CircleDollarSign, roles: ['administrativo', 'recepcao', 'medico'],
    items: [
      { id: 'repasse_terceiros', label: 'Repasse a terceiros', icon: Users },
      { id: 'repasse_socios', label: 'Repasse a sócios', icon: CircleDollarSign },
    ],
  },
  {
    label: 'Relatórios', icon: FileText, roles: ['administrativo'],
    items: [{ id: 'relatorios', label: 'Relatório de repasses', icon: FileText }],
  },
  {
    label: 'Cadastros', icon: Settings2, roles: ['administrativo'],
    items: [
      { id: 'medicos', label: 'Médicos', icon: UserRound },
      { id: 'convenios', label: 'Convênios', icon: Building2 },
      { id: 'hospitais', label: 'Hospitais e clínicas', icon: Building2 },
      { id: 'unidades', label: 'Unidades', icon: Building2 },
      { id: 'procedimentos', label: 'Procedimentos', icon: Stethoscope },
      { id: 'usuarios', label: 'Usuários', icon: ShieldCheck },
    ],
  },
];

const pageTitles: Record<Page, string> = {
  repasse_terceiros: 'Repasse a terceiros',
  repasse_socios: 'Repasse a sócios',
  relatorios: 'Relatório de repasses',
  medicos: 'Médicos',
  convenios: 'Convênios',
  hospitais: 'Hospitais e clínicas',
  unidades: 'Unidades',
  procedimentos: 'Procedimentos',
  usuarios: 'Cadastro de usuários',
};

function AppContent() {
  const { user, perfil, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('repasse_terceiros');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['Repasse médico']));

  if (loading) return <div className="loading-screen"><img src="/logo_vertebrare-removebg copy 3.png" alt="Vertebrare" className="loading-logo" /><span>Carregando seu espaço...</span></div>;
  if (!user) return <LoginForm />;
  if (!perfil) return <div className="loading-screen"><span>Carregando perfil...</span></div>;

  const tipo = perfil.tipo;
  const visibleGroups = menuGroups.filter((g) => g.roles.includes(tipo));
  const defaultPage = tipo === 'medico' ? 'repasse_terceiros' : 'repasse_terceiros';

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const navigate = (nextPage: Page) => { setPage(nextPage); setSidebarOpen(false); };

  const renderPage = () => {
    switch (page) {
      case 'repasse_terceiros': return <RepasseComponent tipo="terceiro" />;
      case 'repasse_socios': return <RepasseComponent tipo="socio" />;
      case 'relatorios': return <RelatoriosComponent />;
      case 'medicos': return <MedicosCadastro />;
      case 'convenios': return <ConveniosCadastro />;
      case 'hospitais': return <HospitaisCadastro />;
      case 'unidades': return <UnidadesCadastro />;
      case 'procedimentos': return <ProcedimentosCadastro />;
      case 'usuarios': return <UsuariosCadastro />;
      default: return <RepasseComponent tipo="terceiro" />;
    }
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <img src="/logo_vertebrare-removebg copy 3.png" alt="Vertebrare" className="brand-logo" />
          {!collapsed && <div><strong>Vertebrare</strong><span>Controle de Repasse</span></div>}
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <div className="sidebar-caption">{!collapsed && 'MENU PRINCIPAL'}</div>
        <nav>
          {visibleGroups.map((group) => {
            const isOpen = openGroups.has(group.label) || collapsed;
            const hasActive = group.items.some((i) => i.id === page);
            return (
              <div className="menu-group" key={group.label}>
                {!collapsed && (
                  <button className={`menu-group-header ${hasActive ? 'active-group' : ''}`} onClick={() => toggleGroup(group.label)}>
                    <group.icon size={18} />
                    <span>{group.label}</span>
                    <ChevronDown size={15} className={isOpen ? 'chevron-open' : ''} />
                  </button>
                )}
                {(isOpen || collapsed) && group.items.map((item) => (
                  <button key={item.id} className={`menu-item ${page === item.id ? 'active' : ''} ${collapsed ? 'indented' : ''}`} onClick={() => navigate(item.id)} title={collapsed ? item.label : undefined}>
                    <item.icon size={16} />{!collapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && <div className="account-card"><div className="avatar"><UsersRound size={16} /></div><div><strong>{perfil.nome}</strong><span>{perfil.email}</span></div></div>}
          <button className="menu-item" onClick={() => void signOut()}><LogOut size={18} />{!collapsed && <span>Sair</span>}</button>
        </div>
        <button className="collapse-button" onClick={() => setCollapsed((v) => !v)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div><span className="breadcrumb">Vertebrare / {pageTitles[page]}</span><h2>{pageTitles[page]}</h2></div>
          <div className="topbar-actions"><span className="secure-badge"><Settings2 size={15} /> {tipo === 'administrativo' ? 'Administrador' : tipo === 'recepcao' ? 'Recepção' : 'Médico'}</span><div className="top-avatar"><UserRound size={16} /></div></div>
        </header>
        <div className="content-area">{renderPage()}</div>
      </main>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
