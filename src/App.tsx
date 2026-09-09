import { useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LogOut,
  Menu,
  Settings2,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { RepasseComponent } from './components/Repasse';
import { ProducaoMensalComponent } from './components/ProducaoMensal';
import { MedicosCadastro } from './components/Cadastros/MedicosCadastro';
import { ConveniosCadastro } from './components/Cadastros/ConveniosCadastro';
import { HospitaisCadastro } from './components/Cadastros/HospitaisCadastro';
import { UnidadesCadastro } from './components/Cadastros/UnidadesCadastro';
import { ProcedimentosCadastro } from './components/Cadastros/ProcedimentosCadastro';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';

type Page = 'overview' | 'repasses' | 'producao' | 'medicos' | 'convenios' | 'hospitais' | 'unidades' | 'procedimentos';

const menuGroups = [
  { label: 'Visão geral', items: [{ id: 'overview' as Page, label: 'Resumo financeiro', icon: BarChart3 }] },
  { label: 'Operação', items: [{ id: 'repasses' as Page, label: 'Repasses médicos', icon: CircleDollarSign }, { id: 'producao' as Page, label: 'Produção mensal', icon: ClipboardList }] },
  { label: 'Cadastros', items: [{ id: 'medicos' as Page, label: 'Médicos', icon: UserRound }, { id: 'convenios' as Page, label: 'Convênios', icon: Building2 }, { id: 'hospitais' as Page, label: 'Hospitais e clínicas', icon: Building2 }, { id: 'unidades' as Page, label: 'Unidades', icon: Building2 }, { id: 'procedimentos' as Page, label: 'Procedimentos', icon: Stethoscope }] },
];

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('repasses');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return <div className="loading-screen"><div className="loading-mark"><Stethoscope size={24} /></div><span>Carregando seu espaço financeiro...</span></div>;
  if (!user) return <LoginForm />;

  const pageTitle = page === 'overview' ? 'Resumo financeiro' : page === 'repasses' ? 'Repasses médicos' : page === 'producao' ? 'Produção mensal' : page === 'medicos' ? 'Médicos' : page === 'convenios' ? 'Convênios' : page === 'hospitais' ? 'Hospitais e clínicas' : page === 'unidades' ? 'Unidades' : 'Procedimentos';

  const renderPage = () => {
    if (page === 'repasses') return <RepasseComponent />;
    if (page === 'producao') return <ProducaoMensalComponent />;
    if (page === 'medicos') return <MedicosCadastro />;
    if (page === 'convenios') return <ConveniosCadastro />;
    if (page === 'hospitais') return <HospitaisCadastro />;
    if (page === 'unidades') return <UnidadesCadastro />;
    if (page === 'procedimentos') return <ProcedimentosCadastro />;
    return <Overview onNavigate={setPage} />;
  };

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Stethoscope size={21} /></div>{!collapsed && <div><strong>MedControl</strong><span>Gestão médica</span></div>}<button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <div className="sidebar-caption">{!collapsed && 'MENU PRINCIPAL'}</div>
        <nav>{menuGroups.map((group) => <div className="menu-group" key={group.label}>{!collapsed && <span className="menu-label">{group.label}</span>}{group.items.map((item) => <button key={item.id} className={`menu-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} title={collapsed ? item.label : undefined}><item.icon size={18} />{!collapsed && <span>{item.label}</span>}</button>)}</div>)}</nav>
        <div className="sidebar-bottom">{!collapsed && <div className="account-card"><div className="avatar"><UsersRound size={16} /></div><div><strong>Conta ativa</strong><span>{user.email}</span></div></div>}<button className="menu-item" onClick={() => void signOut()}><LogOut size={18} />{!collapsed && <span>Sair</span>}</button></div>
        <button className="collapse-button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div><span className="breadcrumb">MedControl / {pageTitle}</span><h2>{pageTitle}</h2></div><div className="topbar-actions"><span className="secure-badge"><Settings2 size={15} /> Ambiente seguro</span><div className="top-avatar"><UserRound size={16} /></div></div></header>
        <div className="content-area">{renderPage()}</div>
      </main>
    </div>
  );
}

function Overview({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return <div className="overview-page"><section className="overview-hero"><div><span className="eyebrow">Painel de controle</span><h1>Tenha clareza sobre cada repasse.</h1><p>Organize terceiros e sócios em um único fluxo, com descontos e valores líquidos separados.</p></div><button className="button button-light" onClick={() => onNavigate('repasses')}><CircleDollarSign size={18} /> Abrir repasses</button></section><div className="overview-grid"><button onClick={() => onNavigate('repasses')} className="overview-card"><div className="overview-icon blue"><CircleDollarSign size={21} /></div><strong>Repasses médicos</strong><span>Controle terceiros, sócios, descontos e pagamentos.</span><b>Gerenciar agora <ChevronRight size={16} /></b></button><button onClick={() => onNavigate('producao')} className="overview-card"><div className="overview-icon green"><ClipboardList size={21} /></div><strong>Produção mensal</strong><span>Acompanhe consultas e cirurgias por competência.</span><b>Ver produção <ChevronRight size={16} /></b></button><button onClick={() => onNavigate('medicos')} className="overview-card"><div className="overview-icon amber"><UserRound size={21} /></div><strong>Cadastros de apoio</strong><span>Mantenha médicos, convênios e hospitais atualizados.</span><b>Ver cadastros <ChevronRight size={16} /></b></button></div></div>;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
