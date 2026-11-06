'use strict';

/* ============ Estado e persistência ============ */
const KEY = 'chamados-demo-v1';
const store = {
  load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.chamados) return s; } catch (_) {}
    return { chamados: structuredClone(DEMO.chamados), userId: null, tema: null };
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} },
};
let state = store.load();

const STATUS = {
  pendente: 'Pendente', andamento: 'Em andamento', desenvolvimento: 'Desenvolvimento',
  concluido: 'Concluído', arquivado: 'Arquivado',
};
const PRIORIDADE = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };
const SLA_HORAS = { urgente: 4, alta: 24, media: 72, baixa: 168 };
const PERFIL = { admin: 'Administrador', responsavel: 'Responsável', usuario: 'Usuário' };

/* ============ Utilitários ============ */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const user = id => DEMO.usuarios.find(u => u.id === id);
const eu = () => user(state.userId);
const ehEquipe = () => ['admin', 'responsavel'].includes(eu()?.perfil);
const iniciais = n => n.split(' ').map(p => p[0]).slice(0, 2).join('');
const avatar = (u, size = '') => `<span class="avatar ${size}" style="background:${u.cor}" title="${esc(u.nome)}">${esc(iniciais(u.nome))}</span>`;
const fmtData = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function relativo(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}
const visiveis = () => state.chamados.filter(c => ehEquipe() || c.solicitante === state.userId);
const aberto = c => !['concluido', 'arquivado'].includes(c.status);

function sla(c) {
  if (!aberto(c)) return { cls: 'ok', txt: 'Finalizado' };
  const limite = new Date(c.criadoEm).getTime() + SLA_HORAS[c.prioridade] * 3600e3;
  const resta = limite - Date.now();
  if (resta < 0) return { cls: 'late', txt: 'SLA estourado' };
  if (resta < SLA_HORAS[c.prioridade] * 3600e3 * 0.25) return { cls: 'warn', txt: `Vence em ${Math.max(1, Math.round(resta / 3600e3))} h` };
  return { cls: 'ok', txt: 'No prazo' };
}
const badgeStatus = s => `<span class="badge st-${s}">${STATUS[s]}</span>`;
const badgePrio = p => `<span class="badge pr-${p}">${PRIORIDADE[p]}</span>`;
const badgeSla = c => { const s = sla(c); return `<span class="badge sla-${s.cls}">${s.txt}</span>`; };

/* ============ Toast e modal (nada de alert/confirm nativo) ============ */
function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}
function confirmar(titulo, texto, ok = 'Confirmar') {
  return new Promise(res => {
    const m = $('#modal');
    $('#modal-title').textContent = titulo;
    $('#modal-text').textContent = texto;
    $('#modal-ok').textContent = ok;
    m.hidden = false;
    const fim = v => { m.hidden = true; $('#modal-ok').onclick = $('#modal-cancel').onclick = null; res(v); };
    $('#modal-ok').onclick = () => fim(true);
    $('#modal-cancel').onclick = () => fim(false);
  });
}

/* ============ Ações ============ */
function log(c, texto) {
  const em = new Date().toISOString();
  c.timeline.push({ tipo: 'log', autor: state.userId, texto, em });
  c.atualizadoEm = em;
}
function mudarStatus(c, s) {
  if (c.status === s) return;
  c.status = s;
  c.concluidoEm = aberto(c) ? null : new Date().toISOString();
  log(c, `alterou o status para ${STATUS[s]}`);
  store.save();
  toast(`#${c.id} → ${STATUS[s]}`);
}

/* ============ Layout ============ */
function tema() {
  const t = state.tema || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
  return t;
}

function shell(ativo, titulo, conteudo) {
  const u = eu();
  const pend = visiveis().filter(c => c.status === 'pendente').length;
  const link = (rota, icone, txt, extra = '') =>
    `<a href="#/${rota}" class="nav ${ativo === rota ? 'on' : ''}">${icone}<span>${txt}</span>${extra}</a>`;
  return `
  <aside class="sidebar" id="sidebar">
    <div class="brand"><span class="logo">${ICON.logo}</span><div><b>Chamados</b><small>Demo</small></div></div>
    <nav>
      ${link('dashboard', ICON.dash, 'Dashboard')}
      ${link('chamados', ICON.list, ehEquipe() ? 'Todos os chamados' : 'Meus chamados', pend ? `<em>${pend}</em>` : '')}
      ${ehEquipe() ? link('kanban', ICON.kanban, 'Quadro kanban') : ''}
      ${link('novo', ICON.plus, 'Novo chamado')}
    </nav>
    <div class="sb-foot">
      <div class="me">${avatar(u)}<div><b>${esc(u.nome)}</b><small>${PERFIL[u.perfil]}</small></div></div>
      <button class="icon-btn" data-act="sair" title="Trocar de perfil">${ICON.out}</button>
    </div>
  </aside>
  <main class="main">
    <header class="topbar">
      <button class="icon-btn burger" data-act="menu" aria-label="Menu">${ICON.menu}</button>
      <h1>${titulo}</h1>
      <div class="top-actions">
        <button class="icon-btn" data-act="tema" title="Alternar tema">${tema() === 'dark' ? ICON.sun : ICON.moon}</button>
        <button class="btn ghost sm" data-act="reset" title="Restaurar os dados de exemplo">Restaurar demo</button>
      </div>
    </header>
    <section class="content">${conteudo}</section>
  </main>`;
}

/* ============ Telas ============ */
function telaLogin() {
  return `
  <div class="login">
    <div class="login-card">
      <span class="logo big">${ICON.logo}</span>
      <h1>Sistema de Chamados</h1>
      <p class="muted">Demonstração com dados 100% fictícios. Escolha um perfil para entrar:</p>
      <div class="perfis">
        ${DEMO.usuarios.filter(u => [1, 2, 4].includes(u.id)).map(u => `
          <button class="perfil" data-login="${u.id}">
            ${avatar(u, 'lg')}
            <b>${esc(u.nome)}</b>
            <small>${PERFIL[u.perfil]}</small>
            <span class="muted xs">${u.perfil === 'usuario' ? 'Abre e acompanha os próprios chamados' : u.perfil === 'admin' ? 'Vê tudo, atribui e gerencia' : 'Atende e move chamados no quadro'}</span>
          </button>`).join('')}
      </div>
      <p class="muted xs">Tudo o que você fizer fica salvo só neste navegador.</p>
    </div>
  </div>`;
}

function telaDashboard() {
  const cs = visiveis();
  const abertos = cs.filter(aberto);
  const atrasados = abertos.filter(c => sla(c).cls === 'late');
  const semResp = abertos.filter(c => !c.responsaveis.length);
  const concl30 = cs.filter(c => c.concluidoEm && Date.now() - new Date(c.concluidoEm) < 30 * 864e5);
  const card = (n, label, cls, rota) => `<a class="stat ${cls}" href="#/chamados${rota}"><b>${n}</b><span>${label}</span></a>`;
  const porPrio = Object.keys(PRIORIDADE).map(p => [p, abertos.filter(c => c.prioridade === p).length]);
  const max = Math.max(1, ...porPrio.map(x => x[1]));
  const atividades = cs.flatMap(c => c.timeline.map(t => ({ ...t, c }))).sort((a, b) => b.em.localeCompare(a.em)).slice(0, 7);
  return `
  <div class="stats">
    ${card(abertos.length, 'Em aberto', '', '')}
    ${card(atrasados.length, 'SLA estourado', 'late', '?sla=late')}
    ${card(semResp.length, 'Sem responsável', 'warn', '?sem=1')}
    ${card(concl30.length, 'Concluídos (30 dias)', 'ok', '?status=concluido')}
  </div>
  <div class="grid2">
    <div class="panel">
      <h2>Abertos por prioridade</h2>
      <div class="bars">
        ${porPrio.map(([p, n]) => `
          <div class="bar-row"><span>${PRIORIDADE[p]}</span>
            <div class="bar"><i class="pr-${p}" style="width:${(n / max) * 100}%"></i></div><b>${n}</b></div>`).join('')}
      </div>
      <h2 class="mt">Por status</h2>
      <div class="chips">${Object.keys(STATUS).map(s => `<a href="#/chamados?status=${s}" class="badge st-${s}">${STATUS[s]} · ${cs.filter(c => c.status === s).length}</a>`).join('')}</div>
    </div>
    <div class="panel">
      <h2>Atividade recente</h2>
      <ul class="feed">
        ${atividades.map(a => `<li>${avatar(user(a.autor), 'sm')}<div><b>${esc(user(a.autor).nome)}</b>
          ${a.tipo === 'comentario' ? 'comentou em' : esc(a.texto) + ' ·'} <a href="#/chamado/${a.c.id}">#${a.c.id} ${esc(a.c.titulo)}</a>
          <small>${relativo(a.em)}</small></div></li>`).join('') || '<li class="muted">Nenhuma atividade ainda.</li>'}
      </ul>
    </div>
  </div>
  ${atrasados.length ? `<div class="panel"><h2>Precisam de atenção agora</h2>${tabela(atrasados)}</div>` : ''}`;
}

function tabela(lista) {
  if (!lista.length) return `<div class="empty">Nenhum chamado encontrado.</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Chamado</th><th>Status</th><th>Prioridade</th><th>SLA</th><th>Responsáveis</th><th>Atualizado</th></tr></thead>
    <tbody>${lista.map(c => `
      <tr data-go="${c.id}">
        <td class="muted">${c.id}</td>
        <td><b>${esc(c.titulo)}</b><small class="muted block">${esc(c.cliente)}</small></td>
        <td>${badgeStatus(c.status)}</td><td>${badgePrio(c.prioridade)}</td><td>${badgeSla(c)}</td>
        <td><div class="stack">${c.responsaveis.map(id => avatar(user(id), 'sm')).join('') || '<span class="muted xs">—</span>'}</div></td>
        <td class="muted xs">${relativo(c.atualizadoEm)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

function telaLista(params) {
  return `
  <div class="filters">
    <input type="search" id="f-busca" placeholder="Buscar por título, cliente ou nº (ignora acentos)" value="${esc(params.get('q') || '')}" />
    <select id="f-status"><option value="">Todos os status</option><option value="abertos">Só abertos</option>
      ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${params.get('status') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select id="f-prio"><option value="">Todas as prioridades</option>
      ${Object.entries(PRIORIDADE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
  </div>
  ${params.get('sla') ? '<p class="muted xs">Filtro ativo: SLA estourado · <a href="#/chamados">limpar</a></p>' : ''}
  ${params.get('sem') ? '<p class="muted xs">Filtro ativo: sem responsável · <a href="#/chamados">limpar</a></p>' : ''}
  <div id="lista"></div>`;
}
function filtrarLista(params) {
  const termos = norm($('#f-busca').value).split(/\s+/).filter(Boolean);
  const st = $('#f-status').value, pr = $('#f-prio').value;
  let l = visiveis().filter(c =>
    termos.every(t => norm(`${c.id} ${c.titulo} ${c.descricao} ${c.cliente} ${c.tags.join(' ')}`).includes(t)) &&
    (!st || (st === 'abertos' ? aberto(c) : c.status === st)) &&
    (!pr || c.prioridade === pr) &&
    (!params.get('sla') || (aberto(c) && sla(c).cls === 'late')) &&
    (!params.get('sem') || (aberto(c) && !c.responsaveis.length)));
  const peso = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  l.sort((a, b) => (aberto(b) - aberto(a)) || (peso[a.prioridade] - peso[b.prioridade]) || b.atualizadoEm.localeCompare(a.atualizadoEm));
  $('#lista').innerHTML = tabela(l);
}

function telaKanban() {
  const cols = ['pendente', 'andamento', 'desenvolvimento', 'concluido'];
  const cs = visiveis();
  return `<p class="muted xs">Arraste os cartões entre as colunas para mudar o status.</p>
  <div class="kanban">${cols.map(s => {
    const itens = cs.filter(c => c.status === s);
    return `<div class="col" data-drop="${s}">
      <h3>${badgeStatus(s)} <span class="muted">${itens.length}</span></h3>
      ${itens.map(c => `
        <article class="kcard" draggable="true" data-drag="${c.id}" data-go="${c.id}">
          <div class="krow"><span class="muted xs">#${c.id}</span>${badgePrio(c.prioridade)}</div>
          <b>${esc(c.titulo)}</b>
          <small class="muted">${esc(c.cliente)}</small>
          <div class="krow">${badgeSla(c)}<div class="stack">${c.responsaveis.map(id => avatar(user(id), 'sm')).join('')}</div></div>
        </article>`).join('') || '<div class="empty sm">Vazio</div>'}
    </div>`;
  }).join('')}</div>`;
}

function telaChamado(id) {
  const c = state.chamados.find(x => x.id === id);
  if (!c || !(ehEquipe() || c.solicitante === state.userId)) return `<div class="empty">Chamado não encontrado ou sem permissão.</div>`;
  const eq = ehEquipe();
  const feitos = c.checklist.filter(i => i.ok).length;
  return `
  <div class="ticket-head">
    <div>
      <a href="#/chamados" class="muted xs">← Voltar</a>
      <h2>#${c.id} · ${esc(c.titulo)}</h2>
      <div class="chips">${badgeStatus(c.status)} ${badgePrio(c.prioridade)} ${badgeSla(c)}
        <span class="muted xs">Aberto por ${esc(user(c.solicitante).nome)} · ${fmtData(c.criadoEm)}</span></div>
    </div>
    <div class="head-actions">
      <button class="btn ghost sm" data-act="imprimir">${ICON.print} Imprimir</button>
      ${eq && c.status !== 'arquivado' ? `<button class="btn ghost sm" data-act="arquivar">Arquivar</button>` : ''}
    </div>
  </div>
  <div class="ticket">
    <div class="ticket-main">
      <div class="panel"><h2>Descrição</h2><p class="desc">${esc(c.descricao)}</p></div>
      <div class="panel">
        <h2>Checklist <span class="muted xs">${feitos}/${c.checklist.length}</span></h2>
        ${c.checklist.length ? `<div class="progress"><i style="width:${(feitos / c.checklist.length) * 100}%"></i></div>` : ''}
        <ul class="check">${c.checklist.map((i, n) => `
          <li><label><input type="checkbox" data-check="${n}" ${i.ok ? 'checked' : ''} ${eq ? '' : 'disabled'} /> <span>${esc(i.texto)}</span></label>
          ${eq ? `<button class="x" data-uncheck="${n}" title="Remover">×</button>` : ''}</li>`).join('')}</ul>
        ${eq ? `<form class="inline" data-form="check"><input name="t" placeholder="Novo item do checklist" maxlength="120" required /><button class="btn sm">Adicionar</button></form>` : ''}
      </div>
      <div class="panel">
        <h2>Linha do tempo</h2>
        <ul class="timeline">${[...c.timeline].reverse().map(t => `
          <li class="${t.tipo}">${avatar(user(t.autor), 'sm')}
            <div>${t.tipo === 'comentario'
              ? `<b>${esc(user(t.autor).nome)}</b> <small class="muted">${relativo(t.em)}</small><p>${esc(t.texto)}</p>`
              : `<span class="muted"><b>${esc(user(t.autor).nome)}</b> ${esc(t.texto)} · ${relativo(t.em)}</span>`}</div></li>`).join('')}</ul>
        <form class="comment" data-form="comentario">
          <textarea name="t" rows="3" placeholder="Escreva um comentário…" maxlength="1000" required></textarea>
          <button class="btn">Comentar</button>
        </form>
      </div>
    </div>
    <aside class="ticket-side">
      <div class="panel">
        <label class="lbl">Status</label>
        <select data-campo="status" ${eq ? '' : 'disabled'}>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <label class="lbl">Prioridade</label>
        <select data-campo="prioridade" ${eq ? '' : 'disabled'}>${Object.entries(PRIORIDADE).map(([k, v]) => `<option value="${k}" ${c.prioridade === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <p class="muted xs">SLA da prioridade ${PRIORIDADE[c.prioridade]}: ${SLA_HORAS[c.prioridade]} h</p>
        <label class="lbl">Cliente</label><p>${esc(c.cliente)}</p>
      </div>
      <div class="panel">
        <label class="lbl">Responsáveis</label>
        <div class="people">${DEMO.usuarios.filter(u => u.perfil !== 'usuario').map(u => `
          <label class="person ${c.responsaveis.includes(u.id) ? 'on' : ''}">
            <input type="checkbox" data-resp="${u.id}" ${c.responsaveis.includes(u.id) ? 'checked' : ''} ${eq ? '' : 'disabled'} />
            ${avatar(u, 'sm')} ${esc(u.nome)}</label>`).join('')}</div>
      </div>
      <div class="panel">
        <label class="lbl">Etiquetas</label>
        <div class="chips">${DEMO.tagsDisponiveis.map(t => `
          <button class="tag ${c.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}" ${eq ? '' : 'disabled'}>${esc(t)}</button>`).join('')}</div>
      </div>
    </aside>
  </div>`;
}

function telaNovo() {
  return `
  <form class="panel form" data-form="novo">
    <label class="lbl">Título *</label>
    <input name="titulo" maxlength="100" required placeholder="Resumo do problema" />
    <label class="lbl">Descrição *</label>
    <textarea name="descricao" rows="5" maxlength="2000" required placeholder="Descreva o que aconteceu, quando e o que já foi tentado"></textarea>
    <div class="row">
      <div><label class="lbl">Cliente</label><select name="cliente">${DEMO.clientes.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div><label class="lbl">Prioridade</label><select name="prioridade">${Object.entries(PRIORIDADE).map(([k, v]) => `<option value="${k}" ${k === 'media' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <div class="form-actions"><a class="btn ghost" href="#/chamados">Cancelar</a><button class="btn">Abrir chamado</button></div>
  </form>`;
}

/* ============ Roteador ============ */
function render() {
  if (!state.userId) { $('#app').innerHTML = telaLogin(); tema(); return; }
  const [rota, query = ''] = location.hash.replace(/^#\//, '').split('?');
  const [nome, arg] = rota.split('/');
  const params = new URLSearchParams(query);
  let html;
  switch (nome) {
    case 'chamados': html = shell('chamados', ehEquipe() ? 'Todos os chamados' : 'Meus chamados', telaLista(params)); break;
    case 'kanban': html = ehEquipe() ? shell('kanban', 'Quadro kanban', telaKanban()) : null; break;
    case 'novo': html = shell('novo', 'Novo chamado', telaNovo()); break;
    case 'chamado': html = shell('chamados', 'Chamado', telaChamado(Number(arg))); break;
    case 'dashboard': html = shell('dashboard', `Olá, ${esc(eu().nome.split(' ')[0])} 👋`, telaDashboard()); break;
    default: html = null;
  }
  if (!html) { location.hash = '#/dashboard'; return; }
  $('#app').innerHTML = html;
  if (nome === 'chamados') {
    filtrarLista(params);
    ['f-busca', 'f-status', 'f-prio'].forEach(i => $('#' + i).addEventListener('input', () => filtrarLista(params)));
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ============ Eventos (delegados) ============ */
const chamadoAtual = () => state.chamados.find(c => c.id === Number(location.hash.split('/')[2]));

document.addEventListener('click', async e => {
  const t = e.target;
  const login = t.closest('[data-login]');
  if (login) { state.userId = Number(login.dataset.login); store.save(); location.hash = '#/dashboard'; render(); toast(`Entrou como ${eu().nome}`); return; }

  const act = t.closest('[data-act]')?.dataset.act;
  if (act === 'sair') { state.userId = null; store.save(); location.hash = ''; render(); return; }
  if (act === 'menu') { $('#sidebar').classList.toggle('open'); return; }
  if (act === 'tema') { state.tema = tema() === 'dark' ? 'light' : 'dark'; store.save(); render(); return; }
  if (act === 'imprimir') { window.print(); return; }
  if (act === 'reset') {
    if (await confirmar('Restaurar demo', 'Isso apaga o que você alterou e volta aos dados de exemplo.', 'Restaurar')) {
      state.chamados = structuredClone(DEMO.chamados); store.save(); render(); toast('Dados de exemplo restaurados');
    }
    return;
  }
  if (act === 'arquivar') {
    const c = chamadoAtual();
    if (await confirmar('Arquivar chamado', `O chamado #${c.id} sai da lista de abertos.`, 'Arquivar')) { mudarStatus(c, 'arquivado'); render(); }
    return;
  }

  const tag = t.closest('[data-tag]');
  if (tag && ehEquipe()) {
    const c = chamadoAtual(), v = tag.dataset.tag;
    c.tags = c.tags.includes(v) ? c.tags.filter(x => x !== v) : [...c.tags, v];
    log(c, `${c.tags.includes(v) ? 'adicionou' : 'removeu'} a etiqueta "${v}"`); store.save(); render(); return;
  }
  const rm = t.closest('[data-uncheck]');
  if (rm) { const c = chamadoAtual(); const [i] = c.checklist.splice(Number(rm.dataset.uncheck), 1); log(c, `removeu "${i.texto}" do checklist`); store.save(); render(); return; }

  const go = t.closest('[data-go]');
  if (go && !t.closest('a')) { location.hash = `#/chamado/${go.dataset.go}`; return; }

  if (!t.closest('#sidebar') && !t.closest('.burger')) $('#sidebar')?.classList.remove('open');
});

document.addEventListener('change', e => {
  const t = e.target, c = chamadoAtual();
  if (!c) return;
  if (t.dataset.campo === 'status') { mudarStatus(c, t.value); render(); }
  else if (t.dataset.campo === 'prioridade') { c.prioridade = t.value; log(c, `alterou a prioridade para ${PRIORIDADE[t.value]}`); store.save(); render(); toast('Prioridade atualizada'); }
  else if (t.dataset.check !== undefined) { const i = c.checklist[Number(t.dataset.check)]; i.ok = t.checked; log(c, `${i.ok ? 'concluiu' : 'reabriu'} "${i.texto}"`); store.save(); render(); }
  else if (t.dataset.resp) {
    const id = Number(t.dataset.resp);
    c.responsaveis = t.checked ? [...c.responsaveis, id] : c.responsaveis.filter(x => x !== id);
    log(c, `${t.checked ? 'atribuiu a' : 'removeu'} ${user(id).nome}${t.checked ? '' : ' dos responsáveis'}`);
    if (t.checked && c.status === 'pendente') { c.status = 'andamento'; log(c, 'alterou o status para Em andamento'); }
    store.save(); render(); toast('Responsáveis atualizados');
  }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (f.dataset.form === 'novo') {
    const titulo = d.titulo.trim(), descricao = d.descricao.trim();
    if (!titulo || !descricao) return toast('Preencha título e descrição', 'err');
    const em = new Date().toISOString();
    const id = Math.max(...state.chamados.map(c => c.id)) + 1;
    state.chamados.push({ id, titulo, descricao, cliente: d.cliente, prioridade: d.prioridade, status: 'pendente', criadoEm: em, atualizadoEm: em, concluidoEm: null,
      solicitante: state.userId, responsaveis: [], tags: [], checklist: [], timeline: [{ tipo: 'log', autor: state.userId, texto: 'abriu o chamado', em }] });
    store.save(); toast(`Chamado #${id} aberto`); location.hash = `#/chamado/${id}`;
    return;
  }
  const c = chamadoAtual();
  const texto = (d.t || '').trim();
  if (!texto) return;
  if (f.dataset.form === 'comentario') {
    const em = new Date().toISOString();
    c.timeline.push({ tipo: 'comentario', autor: state.userId, texto, em }); c.atualizadoEm = em; toast('Comentário publicado');
  } else if (f.dataset.form === 'check') {
    c.checklist.push({ texto, ok: false }); log(c, `adicionou "${texto}" ao checklist`);
  }
  store.save(); render();
});

/* Kanban: arrastar e soltar */
document.addEventListener('dragstart', e => {
  const k = e.target.closest?.('[data-drag]');
  if (k) { e.dataTransfer.setData('text/plain', k.dataset.drag); k.classList.add('dragging'); }
});
document.addEventListener('dragend', e => e.target.classList?.remove('dragging'));
document.addEventListener('dragover', e => { const col = e.target.closest?.('[data-drop]'); if (col) { e.preventDefault(); col.classList.add('over'); } });
document.addEventListener('dragleave', e => e.target.closest?.('[data-drop]')?.classList.remove('over'));
document.addEventListener('drop', e => {
  const col = e.target.closest?.('[data-drop]');
  if (!col) return;
  e.preventDefault();
  const c = state.chamados.find(x => x.id === Number(e.dataTransfer.getData('text/plain')));
  if (c) { mudarStatus(c, col.dataset.drop); render(); }
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) $('#modal-cancel').click(); });

/* ============ Ícones (SVG inline) ============ */
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  logo: svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  dash: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
  kanban: svg('<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  out: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  menu: svg('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  print: svg('<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
};

render();
