import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, UserCog, Stethoscope, X, Save } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { useAuth } from '../Auth/AuthContext';
import type { PerfilUsuario, TipoUsuario } from '../Auth/AuthContext';
import type { Medico } from '../../types';

const tipoLabel: Record<TipoUsuario, string> = { administrativo: 'Administrativo', recepcao: 'Recepção', medico: 'Médico' };
const tipoIcon: Record<TipoUsuario, typeof ShieldCheck> = { administrativo: ShieldCheck, recepcao: UserCog, medico: Stethoscope };

export function UsuariosCadastro() {
  const { perfil: admin } = useAuth();
  const [perfis, setPerfis] = useState<PerfilUsuario[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PerfilUsuario | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', tipo: 'recepcao' as TipoUsuario, medico_id: '', ativo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [pRes, mRes] = await Promise.all([dbHelpers.getPerfis(), dbHelpers.getMedicos()]);
    setPerfis((pRes.data as PerfilUsuario[]) || []);
    setMedicos((mRes.data as Medico[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: '', email: '', tipo: 'recepcao', medico_id: '', ativo: true }); setShowForm(true); setError(''); };
  const openEdit = (p: PerfilUsuario) => { setEditing(p); setForm({ nome: p.nome, email: p.email, tipo: p.tipo, medico_id: p.medico_id ? String(p.medico_id) : '', ativo: p.ativo }); setShowForm(true); setError(''); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        const { error } = await dbHelpers.updatePerfil(editing.id, {
          nome: form.nome, tipo: form.tipo,
          medico_id: form.medico_id ? Number(form.medico_id) : null,
          ativo: form.ativo,
        });
        if (error) throw error;
      } else {
        const { data: userData, error: authError } = await dbHelpers.createUserAuth(form.email, 'vertebrare123', form.nome);
        if (authError) throw authError;
        const uid = (userData as any)?.user?.id;
        if (!uid) throw new Error('Não foi possível obter o ID do usuário criado.');
        const { error } = await dbHelpers.createPerfilByAdmin({
          id: uid, nome: form.nome, email: form.email, tipo: form.tipo,
          medico_id: form.medico_id ? Number(form.medico_id) : null, ativo: form.ativo,
        });
        if (error) throw error;
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError('Não foi possível salvar o usuário. Verifique se o e-mail já não está cadastrado.');
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir este usuário? O acesso será removido permanentemente.')) return;
    const { error } = await dbHelpers.deletePerfil(id);
    if (error) setError('Não foi possível excluir o usuário.');
    else await load();
  };

  return <div className="space-y-6">
    <section className="hero-panel"><div><div className="eyebrow"><ShieldCheck size={15} /> Gestão de acesso</div><h1>Cadastro de usuários</h1><p>Gerencie quem acessa o sistema e o nível de cada pessoa.</p></div><div className="hero-actions"><button className="button button-light" onClick={openNew}><Plus size={18} /> Novo usuário</button></div></section>

    {error && <div className="alert-error">{error}</div>}

    {showForm && (
      <div className="modal-overlay" onClick={() => setShowForm(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
          <div className="modal-header"><div><span className="eyebrow">{editing ? 'Editar usuário' : 'Novo usuário'}</span><h2>{editing ? 'Alterar perfil' : 'Cadastrar usuário'}</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div>
          <form className="form-grid" onSubmit={save} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <label className="wide" style={{ gridColumn: '1 / -1' }}>Nome completo<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
            <label className={editing ? 'wide' : ''} style={editing ? { gridColumn: '1 / -1' } : undefined}>E-mail<input required type="email" disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            {!editing && <label>Tipo de usuário<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoUsuario })}><option value="recepcao">Recepção</option><option value="medico">Médico</option><option value="administrativo">Administrativo</option></select></label>}
            {editing && <label>Tipo de usuário<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoUsuario })}><option value="recepcao">Recepção</option><option value="medico">Médico</option><option value="administrativo">Administrativo</option></select></label>}
            {form.tipo === 'medico' && <label className="wide" style={{ gridColumn: '1 / -1' }}>Médico vinculado<select value={form.medico_id} onChange={(e) => setForm({ ...form, medico_id: e.target.value })}><option value="">Selecione o médico</option>{medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>}
            {editing && <label className="wide" style={{ gridColumn: '1 / -1' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Usuário ativo</span></label>}
            <div className="form-actions wide" style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="button button-muted" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="button button-primary" disabled={saving}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    <section className="table-panel">
      <div className="section-title"><div><span className="eyebrow">Usuários cadastrados</span><h2>{perfis.length} pessoas</h2></div></div>
      <div className="table-wrap">
        <table style={{ minWidth: 700 }}>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Médico vinculado</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="empty-state">Carregando...</td></tr> :
             perfis.length === 0 ? <tr><td colSpan={6} className="empty-state"><strong>Nenhum usuário cadastrado</strong><span>Crie o primeiro usuário administrador.</span></td></tr> :
             perfis.map((p) => {
               const Icon = tipoIcon[p.tipo];
               const medicoVinc = medicos.find((m) => m.id === p.medico_id);
               return <tr key={p.id}>
                 <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={16} /><strong>{p.nome}</strong></div></td>
                 <td>{p.email}</td>
                 <td><span className="type-pill">{tipoLabel[p.tipo]}</span></td>
                 <td>{medicoVinc?.nome || '-'}</td>
                 <td><span className={`status-pill ${p.ativo ? 'status-pago' : 'status-pendente'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                 <td><div className="row-actions">
                   {p.id !== admin?.id && <button className="icon-button" onClick={() => openEdit(p)}><Pencil size={16} /></button>}
                   {p.id !== admin?.id && <button className="icon-button danger" onClick={() => void remove(p.id)}><Trash2 size={16} /></button>}
                 </div></td>
               </tr>;
             })}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
