import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type AuthSession, type Listing, type ListingInput } from './api';

const categories = ['Todos', 'Livros', 'Computação', 'Engenharia', 'Saúde', 'Outros'];

function ListingCard({ listing, own, onDelete, onEdit }: { listing: Listing; own?: boolean; onDelete?: (id: number) => void; onEdit?: (listing: Listing) => void }) {
  return <article className="card">
    <div className="card-image"><img src={listing.imageUrl} alt="" /><span className="tag">{listing.category}</span></div>
    <div className="card-body"><small>{listing.isDonation ? 'DOAÇÃO' : 'À VENDA'}</small><h3>{listing.title}</h3><p>{listing.description}</p>
      <div className="card-foot"><strong>{listing.isDonation ? 'Grátis' : listing.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        {own && <span className="card-actions"><button onClick={() => onEdit?.(listing)}>Editar</button><button className="text-danger" onClick={() => onDelete?.(listing.id)}>Excluir</button></span>}</div></div>
  </article>;
}

function PublishForm({ editing, onCancelEdit, onSaved }: { editing?: Listing | null; onCancelEdit?: () => void; onSaved: (listing: Listing, mode: 'created' | 'updated') => void }) {
  const [donation, setDonation] = useState(Boolean(editing?.isDonation));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { setDonation(Boolean(editing?.isDonation)); setMessage(''); }, [editing]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true); setMessage('');
    const form = new FormData(formElement);
    const input: ListingInput = {
      title: String(form.get('title')),
      description: String(form.get('description')),
      category: String(form.get('category')),
      price: donation ? null : Number(form.get('price')),
      isDonation: donation,
      imageUrl: String(form.get('imageUrl'))
    };

    try {
      const result = editing ? await api.update(editing.id, input) : await api.create(input);
      onSaved(result, editing ? 'updated' : 'created');
      if (!editing) { formElement.reset(); setDonation(false); }
      setMessage(editing ? 'Anúncio atualizado!' : 'Anúncio publicado!');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : editing ? 'Erro ao atualizar.' : 'Erro ao publicar.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="publish" id="anunciar"><div><span className="eyebrow">{editing ? 'AJUSTE FINO' : 'NOVO CICLO'}</span><h2>{editing ? 'Editar anúncio.' : 'O que você quer repassar?'}</h2><p>{editing ? 'Atualize preço, descrição ou imagem sempre que precisar.' : 'Seu item parado pode ser exatamente o que outro estudante precisa.'}</p></div>
    <form onSubmit={submit} key={editing?.id ?? 'create'}><label>Título<input name="title" minLength={3} required placeholder="Ex.: Calculadora científica" defaultValue={editing?.title ?? ''} /></label>
      <label>Descrição<textarea name="description" minLength={10} required placeholder="Conte o estado do item e detalhes da entrega" defaultValue={editing?.description ?? ''} /></label>
      <div className="form-row"><label>Categoria<select name="category" defaultValue={editing?.category ?? categories[1]}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>
        <label>URL da imagem<input name="imageUrl" type="url" required placeholder="https://..." defaultValue={editing?.imageUrl ?? ''} /></label></div>
      <div className="form-row"><label className="check"><input type="checkbox" checked={donation} onChange={e => setDonation(e.target.checked)} /> Quero doar este item</label>
        {!donation && <label>Preço (R$)<input name="price" type="number" min="0" step="0.01" required defaultValue={editing?.price ?? ''} /></label>}</div>
      <div className="form-actions"><button className="button" disabled={loading}>{loading ? 'Salvando…' : editing ? 'Salvar alterações' : 'Publicar anúncio'}</button>{editing && <button className="button ghost" type="button" onClick={onCancelEdit}>Cancelar edição</button>}</div>{message && <p role="status">{message}</p>}
    </form></section>;
}

function AuthPanel({ onAuthenticated, onClose }: { onAuthenticated: (session: AuthSession) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const credentials = { email: String(data.get('email')), password: String(data.get('password')) };
      const session = mode === 'login' ? await api.login(credentials) : await api.register({ ...credentials, name: String(data.get('name')) });
      onAuthenticated(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="auth-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <button className="auth-close" aria-label="Fechar" onClick={onClose}>×</button><span className="eyebrow">SUA CONTA</span><h2 id="auth-title">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
    <form onSubmit={submit}>{mode === 'register' && <label>Nome<input name="name" minLength={2} required autoComplete="name" /></label>}<label>E-mail<input name="email" type="email" required autoComplete="email" /></label><label>Senha<input name="password" type="password" minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      <button className="button" disabled={loading}>{loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Cadastrar'}</button>{message && <p className="error" role="alert">{message}</p>}</form>
    <button className="auth-switch" onClick={() => { setMode(current => current === 'login' ? 'register' : 'login'); setMessage(''); }}>{mode === 'login' ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'}</button>
  </section></div>;
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => api.getSession());
  const [showAuth, setShowAuth] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState({ totalListings: 0, donations: 0, activeUsers: 0 });
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [editing, setEditing] = useState<Listing | null>(null);

  const load = async () => {
    try {
      const [items, numbers] = await Promise.all([api.listings(), api.stats()]);
      setListings(items); setStats(numbers);
    } catch {
      setError('A API está indisponível. Inicie o backend e tente novamente.');
    }
  };
  const refreshStats = async () => {
    try { setStats(await api.stats()); }
    catch { setActionMessage('O anúncio foi alterado, mas não foi possível atualizar as estatísticas.'); }
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => listings.filter(item => (tab === 'discover' || item.userId === session?.user.id) && (category === 'Todos' || item.category === category) && `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())), [listings, tab, category, search, session]);

  async function remove(id: number) {
    if (!confirm('Excluir este anúncio?')) return;
    setActionMessage('');
    try {
      await api.remove(id);
      setListings(current => current.filter(item => item.id !== id));
      if (editing?.id === id) setEditing(null);
      setActionMessage('Anúncio excluído.');
      await refreshStats();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Não foi possível excluir o anúncio.');
    }
  }

  function saveListing(item: Listing, mode: 'created' | 'updated') {
    setListings(current => mode === 'created' ? [item, ...current] : current.map(listing => listing.id === item.id ? item : listing));
    setActionMessage(mode === 'updated' ? 'Anúncio atualizado.' : '');
    if (mode === 'updated') { setEditing(null); setTab('mine'); }
    void refreshStats();
  }

  function startEdit(item: Listing) {
    setEditing(item);
    setActionMessage('');
    const publishSection = document.getElementById('anunciar');
    if (publishSection && 'scrollIntoView' in publishSection) publishSection.scrollIntoView({ behavior: 'smooth' });
  }

  function logout() { api.logout(); setSession(null); setTab('discover'); setEditing(null); }

  return <>
    <header><a className="brand" href="#top"><span>↻</span> REPASSA</a><nav><a href="#itens">Explorar</a><a href="#sobre">Como funciona</a>{session ? <><span className="user-name">Olá, {session.user.name}</span><button className="auth-link" onClick={logout}>Sair</button></> : <button className="auth-link" onClick={() => setShowAuth(true)}>Entrar</button>}<a className="nav-cta" href={session ? '#anunciar' : '#'} onClick={event => { if (!session) { event.preventDefault(); setShowAuth(true); } }}>Anunciar item</a></nav></header>
    {showAuth && <AuthPanel onAuthenticated={value => { setSession(value); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
    <main id="top"><section className="hero"><div className="hero-copy"><span className="eyebrow">CIRCULAR É TRANSFORMAR</span><h1>Menos descarte.<br/><em>Mais histórias.</em></h1><p>O marketplace da comunidade universitária para vender, doar e encontrar o que você precisa — perto de você.</p><div className="hero-actions"><a className="button" href="#itens">Encontrar itens</a><a className="button ghost" href="#anunciar">Quero anunciar →</a></div></div><div className="hero-art"><div className="orbit">↻</div><span className="float one">LIVROS</span><span className="float two">TECNOLOGIA</span><span className="float three">DOAÇÕES</span></div></section>
      <section className="stats" aria-label="Estatísticas"><div><strong>{stats.totalListings}+</strong><span>itens circulando</span></div><div><strong>{stats.donations}</strong><span>doações feitas</span></div><div><strong>{stats.activeUsers}+</strong><span>estudantes ativos</span></div></section>
      <section className="market" id="itens"><span className="eyebrow">DESCUBRA PERTO DE VOCÊ</span><h2>Itens que merecem<br/>uma nova história.</h2>
        <div className="tabs"><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>Explorar</button><button className={tab === 'mine' ? 'active' : ''} onClick={() => session ? setTab('mine') : setShowAuth(true)}>Meus anúncios</button></div>
        <div className="filters"><input type="search" placeholder="Buscar um item…" value={search} onChange={e => setSearch(e.target.value)} /><div>{categories.map(c => <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div></div>
        {error && <p className="error">{error}</p>}{actionMessage && <p className="notice" role="status">{actionMessage}</p>}<div className="grid">{visible.map(item => <ListingCard key={item.id} listing={item} own={tab === 'mine'} onDelete={remove} onEdit={startEdit} />)}</div>{!error && visible.length === 0 && <p className="empty">Nenhum item por aqui ainda.</p>}
      </section><section className="how" id="sobre"><span className="eyebrow">SIMPLES ASSIM</span><h2>De estudante<br/>para estudante.</h2><div><article><b>01</b><h3>Anuncie</h3><p>Fotografe, descreva e publique em poucos minutos.</p></article><article><b>02</b><h3>Conecte</h3><p>Encontre alguém da comunidade interessado no item.</p></article><article><b>03</b><h3>Faça circular</h3><p>Combine a entrega no campus e comece uma nova história.</p></article></div></section>
      {session ? <PublishForm editing={editing} onCancelEdit={() => setEditing(null)} onSaved={saveListing} /> : <section className="login-callout" id="anunciar"><span className="eyebrow">NOVO CICLO</span><h2>Entre para anunciar.</h2><p>Crie sua conta gratuita e publique itens para toda a comunidade.</p><button className="button" onClick={() => setShowAuth(true)}>Entrar ou criar conta</button></section>}
    </main><footer><span className="brand">↻ REPASSA</span><p>Feito no campus, para o campus.</p></footer>
  </>;
}
