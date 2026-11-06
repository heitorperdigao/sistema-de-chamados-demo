'use strict';

/* ================= Estado ================= */
const KEY = 'chamados-demo-v2';
function carregar() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.chamados) return s; } catch (_) {}
  return carregar.padrao();
}
carregar.padrao = () => ({ chamados: structuredClone(DEMO.chamados), userId: null, tema: 'dark', escopo: 'meus', retornoFeito: false });
let state = carregar();
const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} };

const STATUS = { pendente: 'Pendente', andamento: 'Em andamento', desenvolvimento: 'Em desenvolvimento', concluido: 'Concluído', arquivado: 'Arquivado' };
const PRIORIDADE = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };
const PERFIL = { admin: 'Administrador', responsavel: 'Responsável', usuario: 'Usuário' };
const DIA = 864e5;

/* ================= Utilitários ================= */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const user = id => DEMO.usuarios.find(u => u.id === id);
const eu = () => user(state.userId);
const primeiro = id => user(id).nome.split(' ')[0];
const ehEquipe = () => eu() && eu().perfil !== 'usuario';
const iniciais = n => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const av = id => `<span class="av" title="${esc(user(id).nome)}">${esc(iniciais(user(id).nome))}</span>`;
const avs = ids => `<span class="avs">${ids.map(av).join('')}</span>`;
const aberto = c => !['concluido', 'arquivado'].includes(c.status);
const naFila = c => aberto(c) && c.status !== 'desenvolvimento';
const prio = p => `<span class="prio p-${p}">${PRIORIDADE[p].toUpperCase()}</span>`;
const stBadge = s => `<span class="st s-${s}">${STATUS[s]}</span>`;
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
function diasPrazo(c) { if (!c.prazo) return null; const p = new Date(c.prazo); p.setHours(0, 0, 0, 0); return Math.round((p - hoje0()) / DIA); }
function rotPrazo(c) {
  const d = diasPrazo(c);
  if (d === null) return { cls: 'none', txt: 'sem prazo', curto: '—' };
  if (d < 0) return { cls: 'late', txt: `atrasado ${-d} dia${d < -1 ? 's' : ''}`, curto: `atrasado ${-d}d` };
  if (d === 0) return { cls: 'today', txt: 'vence hoje', curto: 'hoje' };
  if (d === 1) return { cls: 'soon', txt: 'vence amanhã', curto: 'amanhã' };
  return { cls: 'soon', txt: `vence em ${d} dias`, curto: `em ${d}d` };
}
function relativo(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 6e4);
  if (m < 60) return m < 1 ? 'agora' : `${m}min`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
const fmtData = iso => new Date(iso).toLocaleDateString('pt-BR');
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const dataLonga = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace(',', ',');

const visiveis = () => state.chamados.filter(c => ehEquipe() || c.solicitante === state.userId);
const meus = () => visiveis().filter(c => c.responsaveis.includes(state.userId) || (!ehEquipe() && c.solicitante === state.userId));
const base = () => (state.escopo === 'equipe' && ehEquipe()) ? visiveis() : meus();
const porPrazo = (a, b) => (diasPrazo(a) ?? 999) - (diasPrazo(b) ?? 999);

/* ================= Toast / modal ================= */
function toast(msg, tipo = 'ok') {
  const t = document.createElement('div'); t.className = `toast ${tipo}`; t.innerHTML = `${tipo === 'ok' ? I.check : I.alert}<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3000);
}
function confirmar(titulo, texto, ok = 'Confirmar') {
  return new Promise(res => {
    const m = $('#modal'); $('#modal-title').textContent = titulo; $('#modal-text').textContent = texto; $('#modal-ok').textContent = ok; m.hidden = false;
    const fim = v => { m.hidden = true; res(v); };
    $('#modal-ok').onclick = () => fim(true); $('#modal-cancel').onclick = () => fim(false);
  });
}

/* ================= Ações ================= */
function registrar(c, texto) { const em = new Date().toISOString(); c.timeline.push({ tipo: 'log', autor: state.userId, texto, em }); c.atualizadoEm = em; }
function mudarStatus(c, s) {
  if (c.status === s) return;
  c.status = s; c.concluidoEm = aberto(c) ? null : new Date().toISOString();
  registrar(c, s === 'concluido' ? 'concluiu o chamado' : `alterou o status para ${STATUS[s]}`);
  salvar(); toast(`#${c.id} · ${STATUS[s]}`);
}
function adiar(c) {
  const d = new Date(c.prazo || Date.now()); const base = Math.max(d.getTime(), hoje0());
  const n = new Date(base + DIA); n.setHours(18, 0, 0, 0); c.prazo = n.toISOString();
  registrar(c, `adiou o prazo para ${fmtData(c.prazo)}`); salvar(); toast(`Prazo do #${c.id} adiado para ${fmtData(c.prazo)}`);
}

/* ================= Layout ================= */
function menu(ativo) {
  const grupo = (id, icone, titulo, itens) => {
    const aberto = itens.some(i => i[0] === ativo);
    return `<div class="sb-grp ${aberto ? 'open' : ''}">
      <button class="sb-item" data-grp="${id}">${icone}<span>${titulo}</span>${I.chev}</button>
      <div class="sb-sub">${itens.map(([r, ic, t]) => `<a href="#/${r}" class="${r === ativo ? 'on' : ''}">${ic}<span>${t}</span></a>`).join('')}</div></div>`;
  };
  const solo = (r, ic, t) => `<a href="#/${r}" class="sb-item ${r === ativo ? 'on' : ''}">${ic}<span>${t}</span></a>`;
  const u = eu();
  return `<aside id="sidebar" class="sidebar">
    <div class="sb-marca">${I.headset}<b>CHAMADOS</b><span class="demo-pill">DEMO</span></div>
    <nav class="sb-meio">
      ${solo('inicio', I.home, 'Início')}
      ${grupo('chamados', I.ticket, 'Chamados', [['dashboard', I.gauge, 'Dashboard'], ['novo', I.plusc, 'Novo Chamado'], ['meus', I.list, 'Meus Chamados'], ...(ehEquipe() ? [['pendentes', I.clock, 'Pendentes']] : [])])}
      ${ehEquipe() ? `
      ${grupo('fiscal', I.file, 'Fiscal', [['modulo/sped', I.dot, 'Controle de SPED'], ['modulo/icms', I.dot, 'Validador ICMS'], ['modulo/ie', I.dot, 'Consulta de IE'], ['modulo/ncm', I.dot, 'Consulta de NCM']])}
      ${solo('modulo/relatorios', I.chart, 'Relatórios')}
      ${solo('modulo/homologacao', I.bank, 'Homologação de Boleto')}
      ${grupo('util', I.tools, 'Utilidades', [['modulo/agenda', I.dot, 'Agenda'], ['modulo/kb', I.dot, 'Base de conhecimento'], ['modulo/scripts', I.dot, 'Scripts SQL']])}
      ${grupo('cad', I.users, 'Cadastros', [['modulo/clientes', I.dot, 'Clientes'], ['modulo/usuarios', I.dot, 'Usuários']])}
      ${solo('modulo/chat', I.chat, 'Chat Interno')}` : ''}
    </nav>
    <div class="sb-rodape">
      <button class="sb-reset" data-act="reset">↺ Restaurar dados da demo</button>
      <div class="sb-user"><span class="av lg">${esc(iniciais(u.nome))}</span><div><b>${esc(u.nome)}</b><small>${PERFIL[u.perfil]}</small></div>
      <button class="ic-btn" data-act="sair" title="Trocar de perfil">${I.out}</button></div>
    </div>
  </aside><div class="sb-overlay" data-act="fechar-menu"></div>`;
}

function shell(ativo, conteudo, voltar = true) {
  const notif = visiveis().filter(c => naFila(c) && diasPrazo(c) !== null && diasPrazo(c) <= 0).length;
  return `${menu(ativo)}
  <header class="topbar">
    <button class="ic-btn burger" data-act="menu" aria-label="Menu">${I.menu}</button>
    ${voltar ? `<button class="btn-voltar" data-act="voltar">← Voltar</button>` : ''}
    <div class="top-dir">
      <button class="ic-btn sol" data-act="tema" title="Alternar tema">${state.tema === 'dark' ? I.sun : I.moon}</button>
      <a class="ic-btn sino" href="#/dashboard" title="Notificações">${I.bell}${notif ? `<em>${notif}</em>` : ''}</a>
      <span class="top-user">${esc(eu().nome)}</span>
    </div>
  </header>
  <main class="wrap">${conteudo}</main>
  <button class="chat-fab" data-href="#/modulo/chat" title="Chat interno">${I.chatFill}</button>`;
}

/* ================= Telas ================= */
function telaLogin() {
  return `<div class="login"><div class="login-card">
    <div class="login-marca">${I.headset}<b>Sistema de Chamados</b></div>
    <h1>Demonstração</h1>
    <p class="mut">Dados 100% fictícios. Escolha com qual perfil quer entrar:</p>
    <div class="perfis">${[1, 2, 5].map(id => { const u = user(id); return `
      <button class="perfil" data-login="${id}"><span class="av xl">${esc(iniciais(u.nome))}</span><b>${esc(u.nome)}</b><small>${PERFIL[u.perfil]}</small>
      <span class="mut xs">${u.perfil === 'admin' ? 'Vê toda a equipe, atribui e gerencia' : u.perfil === 'responsavel' ? 'Atende os chamados atribuídos a ele' : 'Abre e acompanha os próprios chamados'}</span></button>`; }).join('')}</div>
    <p class="mut xs">O que você alterar fica salvo só neste navegador.</p>
  </div></div>`;
}

function telaInicio() {
  const fila = meus().filter(naFila).sort(porPrazo);
  const atras = fila.filter(c => diasPrazo(c) < 0).length, hoje = fila.filter(c => diasPrazo(c) === 0).length;
  const proximo = fila[0];
  const resto = fila.slice(1, 5);
  const equipe = visiveis();
  const eqAbertos = equipe.filter(naFila), eqAtras = eqAbertos.filter(c => diasPrazo(c) < 0), eqUrg = eqAbertos.filter(c => c.prioridade === 'urgente');
  const semResp = equipe.filter(c => aberto(c) && !c.responsaveis.length);
  const ativ = equipe.flatMap(c => c.timeline.map(t => ({ ...t, c }))).sort((a, b) => b.em.localeCompare(a.em)).slice(0, 6);
  const atalho = (href, ic, t, sub, cls = '') => `<a class="atalho" href="${href}"><span class="at-ic">${ic}</span><div><b>${t}</b><small class="${cls}">${sub}</small></div></a>`;
  const r = proximo ? rotPrazo(proximo) : null;

  return shell('inicio', `
  <div class="page-head">
    <div><h1>${saudacao()}, ${esc(primeiro(state.userId))}</h1>
      <p class="mut sm">${dataLonga()}${atras ? ` · <b class="t-red">${atras} atrasado${atras > 1 ? 's' : ''}</b>` : ''}${hoje ? ` · <b>${hoje}</b> vence${hoje > 1 ? 'm' : ''} hoje` : ''}${!atras && !hoje ? ' · tudo em dia ✨' : ''}</p></div>
    <div class="head-btns"><button class="btn-busca" data-act="busca">${I.search} Buscar <kbd>Ctrl K</kbd></button><a class="btn-pri" href="#/novo">${I.plus} Novo chamado</a></div>
  </div>
  <div class="atalhos">
    ${atalho('#/dashboard', I.gauge, 'Dashboard', `${eqAbertos.length} abertos ${ehEquipe() ? 'na equipe' : ''}`)}
    ${ehEquipe() ? `${atalho('#/modulo/sped', I.file, 'SPED', '37 faltando · out', 't-amber')}
    ${atalho('#/modulo/icms', I.fileCheck, 'Validador ICMS', 'Fiscal')}
    ${atalho('#/modulo/ie', I.barcode, 'Consulta de IE', 'Fiscal')}` : `${atalho('#/meus', I.list, 'Meus chamados', `${visiveis().length} no total`)}${atalho('#/novo', I.plusc, 'Novo chamado', 'Abrir solicitação')}`}
  </div>
  <div class="inicio-grid">
    <section class="card">
      <h3 class="card-t">${I.briefcase} MEU TRABALHO</h3>
      ${ehEquipe() && !state.retornoFeito ? `<div class="retorno">${I.alarm}<b>Retornar: ligar para Ferragens São Jorge</b><span class="mut xs">há 4 dias</span><button class="chip-ok" data-act="retorno">${I.check} feito</button></div>` : ''}
      ${proximo ? `
      <div class="proximo ${r.cls}">
        <small class="prox-tag">${I.bolt} SEU PRÓXIMO · ${r.txt.toUpperCase()}</small>
        <h2>#${proximo.id} ${esc(proximo.titulo)}</h2>
        <p class="mut sm">${esc(proximo.cliente)} ${prio(proximo.prioridade)}</p>
        <div class="prox-btns">
          <a class="btn-pri sm" href="#/chamado/${proximo.id}">${I.ext} Abrir</a>
          ${ehEquipe() ? `<button class="btn-out sm" data-concluir="${proximo.id}">${I.check} Concluir</button>
          <button class="btn-out sm" data-adiar="${proximo.id}">${I.cal} +1 dia</button>` : ''}
        </div>
      </div>
      <ul class="fila">${resto.map(c => { const p = rotPrazo(c); return `
        <li data-go="${c.id}"><span class="pz pz-${p.cls}">${p.curto}</span><b>#${c.id} ${esc(c.titulo)}</b><small class="mut">${esc(c.cliente)}</small></li>`; }).join('')}</ul>
      ` : `<div class="vazio">${I.checkCircle}<p>Nenhum chamado na sua fila. 🎉</p></div>`}
      <div class="card-foot"><span class="mut xs">${I.cal} Nada mais na agenda hoje</span><a href="#/meus" class="link">ver todos (${fila.length}) →</a></div>
    </section>
    <section class="card">
      <h3 class="card-t">${I.users} ${ehEquipe() ? 'EQUIPE AGORA' : 'SEUS CHAMADOS'}</h3>
      ${ehEquipe() ? `
      ${semResp.length ? `<a class="alerta" href="#/pendentes">${I.alert}<span><b>${semResp.length} chamado${semResp.length > 1 ? 's' : ''} sem responsável</b> — ${semResp.slice(0, 2).map(c => esc(c.cliente)).join(', ')}</span>${I.chevR}</a>` : ''}
      <div class="sped"><div class="sped-l"><span>SPED de <b>outubro</b></span><span class="mut xs">28 de 65 concluídas · <b class="t-amber">faltam 37</b></span></div><div class="barra"><i style="width:43%"></i></div></div>
      <p class="sm">${I.ticket} Equipe: <b>${eqAbertos.length}</b> abertos · <b class="t-red">${eqAtras.length} atrasados</b>${eqUrg.length ? ` · <b class="t-red">${eqUrg.length} urgente${eqUrg.length > 1 ? 's' : ''}</b>` : ''}</p>` : `
      <p class="sm">Você tem <b>${visiveis().filter(aberto).length}</b> chamado(s) em aberto e <b>${visiveis().filter(c => !aberto(c)).length}</b> concluído(s).</p>`}
      <h4 class="sub-t">ATIVIDADE RECENTE</h4>
      <ul class="ativ">${ativ.map(a => `<li data-go="${a.c.id}">${a.tipo === 'comentario' ? I.msg : a.texto.startsWith('abriu') ? I.info : I.pencil}
        <span><b>${esc(primeiro(a.autor))}</b> ${a.tipo === 'comentario' ? 'comentou no' : esc(a.texto.split(' ')[0])} <b>#${a.c.id}</b></span><small class="mut">${relativo(a.em)}</small></li>`).join('')}</ul>
      ${ehEquipe() ? `<div class="online"><span class="mut xs">Por aqui:</span>${[4, 5, 6].map(id => `<span class="on-chip"><span class="av">${iniciais(user(id).nome)}</span>${esc(primeiro(id))}</span>`).join('')}</div>` : ''}
    </section>
  </div>`, false);
}

function telaDashboard() {
  const b = base();
  const fila = b.filter(naFila);
  const atras = fila.filter(c => diasPrazo(c) < 0).sort(porPrazo);
  const hoje = fila.filter(c => diasPrazo(c) === 0);
  const prox = fila.filter(c => diasPrazo(c) > 0).sort(porPrazo);
  const dev = b.filter(c => c.status === 'desenvolvimento');
  const concl = b.filter(c => c.concluidoEm && Date.now() - new Date(c.concluidoEm) < 30 * DIA);
  const res = b.filter(c => c.concluidoEm).map(c => (new Date(c.concluidoEm) - new Date(c.criadoEm)) / DIA).sort((x, y) => x - y);
  const mediana = res.length ? Math.max(1, Math.round(res[Math.floor(res.length / 2)])) : 0;
  const ate7 = atras.filter(c => diasPrazo(c) >= -7).length;
  const kpi = (cls, ic, t, n, sub, suf = '') => `<div class="kpi k-${cls}"><span class="k-ic">${ic}</span><div><small>${t}</small><b>${n}${suf ? `<i>${suf}</i>` : ''}</b><span class="mut xs">${sub}</span></div></div>`;
  const item = (c, extra) => `<li data-go="${c.id}"><div class="it-top"><span class="mut xs">#${c.id}</span>${prio(c.prioridade)}${extra || ''}</div>
    <b>${esc(c.titulo)}</b><div class="it-bot"><small class="mut">${esc(c.cliente)}</small>${avs(c.responsaveis)}</div></li>`;
  const coluna = (cls, ic, t, lista, extraFn, topo = '') => `<section class="col c-${cls}"><div class="col-h"><h3>${ic} ${t} <span class="cnt">${lista.length}</span></h3><a href="#/meus" class="link xs">Ver lista →</a></div>
    ${topo}${lista.length ? `<ul class="lst">${lista.map(c => item(c, extraFn && extraFn(c))).join('')}</ul>` : `<div class="vazio sm">${I.checkCircle}<p>Nada agendado.</p></div>`}</section>`;

  return shell('dashboard', `
  <div class="page-head">
    <div><h1>${I.gauge} Dashboard</h1><p class="mut sm">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · <span class="dot-on"></span> atualizado agora</p></div>
    <div class="head-btns">
      ${ehEquipe() ? `<div class="toggle"><button class="${state.escopo !== 'equipe' ? 'on' : ''}" data-escopo="meus">${I.user} Meus</button><button class="${state.escopo === 'equipe' ? 'on' : ''}" data-escopo="equipe">${I.users} Equipe</button></div>` : ''}
      <a class="btn-pri" href="#/novo">${I.plus} Novo chamado</a>
    </div>
  </div>
  <div class="kpis">
    ${kpi('blue', I.folder, 'ABERTOS', fila.length, 'na fila com prazo')}
    ${kpi('red', I.alertC, 'ATRASADOS', atras.length, atras.length ? 'todos com até 30 dias' : 'nenhum atraso')}
    ${kpi('green', I.checkCircle, 'CONCLUÍDOS', concl.length, 'em 30 dias')}
    ${kpi('purple', I.timer, 'RESOLUÇÃO', mediana, 'mediana · últimos 90 dias', ' dias')}
    ${kpi('cyan', I.code, 'EM DESENV.', dev.length, 'fora da fila de prazo')}
  </div>
  <div class="cols">
    ${coluna('red', I.alertC, 'Atrasados', atras, c => `<span class="t-red xs dir">${rotPrazo(c).txt}</span>`,
      atras.length ? `<div class="faixas"><span>até 7 dias <b>${ate7}</b></span><span>8–30 dias <b>${atras.length - ate7}</b></span></div>` : '')}
    ${coluna('amber', I.clock, 'Para hoje', hoje)}
    ${coluna('blue', I.cal, 'Próximos', prox, c => `<span class="t-blue xs dir">${rotPrazo(c).txt}</span>`)}
  </div>
  <section class="dev">
    <div class="col-h"><h3>${I.code} Em desenvolvimento <span class="cnt">${dev.length}</span></h3><a href="#/meus?status=desenvolvimento" class="link xs">Abrir aba →</a></div>
    <div class="dev-row">${dev.map(c => `<div class="dev-card" data-go="${c.id}"><b><span class="mut">#${c.id}</span> ${esc(c.titulo)}</b><small class="mut">${esc(c.cliente)}</small></div>`).join('') || '<p class="mut sm">Nada em desenvolvimento.</p>'}</div>
  </section>`);
}

function telaLista(tipo, params) {
  const titulo = tipo === 'pendentes' ? 'Pendentes' : 'Meus Chamados';
  const st0 = params.get('status') || (tipo === 'pendentes' ? '' : 'abertos');
  return shell(tipo, `
  <div class="page-head"><div><h1>${tipo === 'pendentes' ? I.clock : I.list} ${titulo}</h1>
    <p class="mut sm">${tipo === 'pendentes' ? 'Chamados da equipe aguardando atendimento ou sem responsável' : ehEquipe() ? 'Chamados em que você é responsável' : 'Chamados que você abriu'}</p></div>
    <div class="head-btns"><a class="btn-pri" href="#/novo">${I.plus} Novo chamado</a></div></div>
  <div class="filtros">
    <div class="busca-in">${I.search}<input id="f-q" type="search" placeholder="Buscar por nº, título, cliente ou etiqueta (ignora acentos)" /></div>
    <select id="f-st"><option value="">Todos os status</option><option value="abertos" ${st0 === 'abertos' ? 'selected' : ''}>Abertos</option>
      ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${st0 === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select id="f-pr"><option value="">Todas as prioridades</option>${Object.entries(PRIORIDADE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
  </div>
  <div id="lista"></div>`);
}
function filtrar(tipo) {
  const termos = norm($('#f-q').value).split(/\s+/).filter(Boolean), st = $('#f-st').value, pr = $('#f-pr').value;
  const fonte = tipo === 'pendentes' ? visiveis().filter(c => aberto(c) && (c.status === 'pendente' || !c.responsaveis.length)) : meus();
  const l = fonte.filter(c => termos.every(t => norm(`${c.id} ${c.titulo} ${c.cliente} ${c.descricao} ${c.tags.join(' ')}`).includes(t))
    && (!st || (st === 'abertos' ? aberto(c) : c.status === st)) && (!pr || c.prioridade === pr))
    .sort((a, b) => (aberto(b) - aberto(a)) || porPrazo(a, b));
  $('#lista').innerHTML = l.length ? `<div class="tabela"><table><thead><tr><th>#</th><th>Chamado</th><th>Status</th><th>Prioridade</th><th>Prazo</th><th>Responsáveis</th></tr></thead><tbody>
    ${l.map(c => { const p = rotPrazo(c); return `<tr data-go="${c.id}"><td class="mut">${c.id}</td><td><b>${esc(c.titulo)}</b><small class="mut blk">${esc(c.cliente)}</small></td>
    <td>${stBadge(c.status)}</td><td>${prio(c.prioridade)}</td><td>${aberto(c) ? `<span class="pz pz-${p.cls}">${p.curto}</span>` : `<span class="mut xs">${fmtData(c.concluidoEm)}</span>`}</td>
    <td>${c.responsaveis.length ? avs(c.responsaveis) : '<span class="mut xs">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>`
    : `<div class="vazio">${I.checkCircle}<p>Nenhum chamado encontrado.</p></div>`;
}

function telaChamado(id) {
  const c = state.chamados.find(x => x.id === id);
  if (!c || !(ehEquipe() || c.solicitante === state.userId)) return shell('meus', `<div class="vazio">${I.alert}<p>Chamado não encontrado ou sem permissão.</p></div>`);
  const eq = ehEquipe(), p = rotPrazo(c), feitos = c.checklist.filter(i => i.ok).length;
  const pz = c.prazo ? c.prazo.slice(0, 10) : '';
  return shell('meus', `
  <div class="ch-head">
    <div><p class="mut sm">#${c.id} · aberto por ${esc(user(c.solicitante).nome)} em ${fmtData(c.criadoEm)}</p>
      <h1>${esc(c.titulo)}</h1>
      <div class="chips">${stBadge(c.status)} ${prio(c.prioridade)} ${aberto(c) && c.status !== 'desenvolvimento' ? `<span class="pz pz-${p.cls}">${p.txt}</span>` : ''} ${c.tags.map(t => `<span class="tag on">${esc(t)}</span>`).join('')}</div></div>
    <div class="head-btns">
      <button class="btn-out" data-act="imprimir">${I.print} Imprimir</button>
      ${eq && aberto(c) ? `<button class="btn-ok" data-concluir="${c.id}">${I.check} Concluir</button>` : ''}
    </div>
  </div>
  <div class="ch-grid">
    <div>
      <section class="card"><h3 class="card-t">${I.file} DESCRIÇÃO</h3><p class="desc">${esc(c.descricao)}</p><p class="mut sm">${I.building} ${esc(c.cliente)}</p></section>
      <section class="card"><h3 class="card-t">${I.listCheck} CHECKLIST <span class="mut">${feitos}/${c.checklist.length}</span></h3>
        ${c.checklist.length ? `<div class="barra verde"><i style="width:${feitos / c.checklist.length * 100}%"></i></div>` : ''}
        <ul class="check">${c.checklist.map((i, n) => `<li><label><input type="checkbox" data-check="${n}" ${i.ok ? 'checked' : ''} ${eq ? '' : 'disabled'}><span>${esc(i.texto)}</span></label>${eq ? `<button class="x" data-rmcheck="${n}" title="Remover">×</button>` : ''}</li>`).join('')}</ul>
        ${eq ? `<form class="inline" data-form="check"><input name="t" placeholder="Novo item" maxlength="120" required><button class="btn-pri sm">Adicionar</button></form>` : ''}
      </section>
      <section class="card"><h3 class="card-t">${I.msg} LINHA DO TEMPO</h3>
        <form class="coment" data-form="comentario"><textarea name="t" rows="3" maxlength="1000" placeholder="Escreva um comentário…" required></textarea><button class="btn-pri sm">Comentar</button></form>
        <ul class="tl">${[...c.timeline].reverse().map(t => t.tipo === 'comentario'
          ? `<li class="tl-c">${av(t.autor)}<div class="balao"><b>${esc(user(t.autor).nome)}</b> <small class="mut">${relativo(t.em)}</small><p>${esc(t.texto)}</p></div></li>`
          : `<li class="tl-l">${I.dot}<span><b>${esc(primeiro(t.autor))}</b> ${esc(t.texto)} · ${relativo(t.em)}</span></li>`).join('')}</ul>
      </section>
    </div>
    <aside>
      <section class="card">
        <label class="lbl">Status</label><select data-campo="status" ${eq ? '' : 'disabled'}>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <label class="lbl">Prioridade</label><select data-campo="prioridade" ${eq ? '' : 'disabled'}>${Object.entries(PRIORIDADE).map(([k, v]) => `<option value="${k}" ${c.prioridade === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <label class="lbl">Prazo</label><div class="inline"><input type="date" data-campo="prazo" value="${pz}" ${eq ? '' : 'disabled'}>${eq && aberto(c) ? `<button class="btn-out sm" data-adiar="${c.id}">+1 dia</button>` : ''}</div>
      </section>
      <section class="card"><label class="lbl">Responsáveis</label>
        <div class="pessoas">${DEMO.usuarios.filter(u => u.perfil !== 'usuario').map(u => `<label class="pessoa ${c.responsaveis.includes(u.id) ? 'on' : ''}"><input type="checkbox" data-resp="${u.id}" ${c.responsaveis.includes(u.id) ? 'checked' : ''} ${eq ? '' : 'disabled'}>${av(u.id)} ${esc(u.nome)}</label>`).join('')}</div>
      </section>
      <section class="card"><label class="lbl">Etiquetas</label>
        <div class="chips">${DEMO.tagsDisponiveis.map(t => `<button class="tag ${c.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}" ${eq ? '' : 'disabled'}>${esc(t)}</button>`).join('')}</div>
      </section>
    </aside>
  </div>`);
}

function telaNovo() {
  const amanha = new Date(Date.now() + 2 * DIA).toISOString().slice(0, 10);
  return shell('novo', `
  <div class="page-head"><div><h1>${I.plusc} Novo Chamado</h1><p class="mut sm">Descreva a solicitação. A equipe é notificada na hora.</p></div></div>
  <form class="card form" data-form="novo">
    <label class="lbl">Título *</label><input name="titulo" maxlength="100" required placeholder="Resumo do problema">
    <label class="lbl">Cliente</label><select name="cliente">${DEMO.clientes.map(c => `<option>${esc(c)}</option>`).join('')}</select>
    <div class="row3">
      <div><label class="lbl">Prioridade</label><select name="prioridade">${Object.entries(PRIORIDADE).map(([k, v]) => `<option value="${k}" ${k === 'media' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div><label class="lbl">Prazo</label><input type="date" name="prazo" value="${amanha}"></div>
      <div><label class="lbl">Responsável</label><select name="resp" ${ehEquipe() ? '' : 'disabled'}><option value="">A definir</option>${DEMO.usuarios.filter(u => u.perfil !== 'usuario').map(u => `<option value="${u.id}">${esc(u.nome)}</option>`).join('')}</select></div>
    </div>
    <label class="lbl">Descrição *</label><textarea name="descricao" rows="6" maxlength="2000" required placeholder="O que aconteceu, quando e o que já foi tentado"></textarea>
    <div class="form-acoes"><a class="btn-out" href="#/inicio">Cancelar</a><button class="btn-pri">${I.plus} Abrir chamado</button></div>
  </form>`);
}

const MODULOS = {
  sped: ['Controle de SPED', 'Grade mensal de entregas de SPED ICMS/PIS e SINTEGRA por cliente, com auto-save e e-mail automático ao concluir.'],
  icms: ['Validador ICMS', 'Confere as alíquotas de ICMS dos produtos contra a tabela vigente e aponta divergências.'],
  ie: ['Consulta de IE', 'Consulta de Inscrição Estadual por CNPJ, com situação cadastral.'],
  ncm: ['Consulta de NCM', 'Busca de NCM por código ou descrição, ignorando acentos.'],
  relatorios: ['Central de Relatórios', 'Catálogo de relatórios do ERP com busca em todas as categorias, favoritos, mais usados e envio de novos relatórios.'],
  homologacao: ['Homologação de Boleto', 'Quadro de homologação de boletos por banco, com histórico de cada etapa.'],
  agenda: ['Agenda', 'Calendário da equipe com retornos e visitas.'],
  kb: ['Base de conhecimento', 'Artigos e tutoriais internos com busca full-text.'],
  scripts: ['Scripts SQL', 'Biblioteca de scripts com botão de copiar.'],
  clientes: ['Clientes', 'Cadastro de clientes com ficha, histórico de chamados e consulta de CNPJ.'],
  usuarios: ['Usuários', 'Gestão de usuários e perfis (Administrador, Responsável, Usuário).'],
  chat: ['Chat Interno', 'Chat em tempo real da equipe (SSE), com grupos, respostas, reações, mensagens fixadas e anexos.'],
};
function telaModulo(id) {
  const m = MODULOS[id] || ['Módulo', ''];
  return shell(`modulo/${id}`, `<div class="card modulo"><span class="mod-ic">${I.lock}</span><h1>${esc(m[0])}</h1><p>${esc(m[1])}</p>
    <p class="mut sm">Este módulo existe no sistema real, que é privado. Esta demonstração pública mostra só o módulo de <b>Chamados</b>.</p>
    <a class="btn-pri" href="#/inicio">Voltar ao início</a></div>`);
}

/* ================= Busca (Ctrl K) ================= */
function abrirBusca() {
  const m = $('#busca'); m.hidden = false; const i = $('#busca-in'); i.value = ''; buscar(''); i.focus();
}
function buscar(q) {
  const termos = norm(q).split(/\s+/).filter(Boolean);
  const l = visiveis().filter(c => termos.every(t => norm(`${c.id} ${c.titulo} ${c.cliente}`).includes(t))).sort((a, b) => (aberto(b) - aberto(a)) || porPrazo(a, b)).slice(0, 8);
  $('#busca-res').innerHTML = l.map(c => `<li data-go="${c.id}"><span class="mut">#${c.id}</span><b>${esc(c.titulo)}</b>${stBadge(c.status)}</li>`).join('') || '<li class="mut">Nada encontrado.</li>';
}

/* ================= Roteador ================= */
function render() {
  document.documentElement.dataset.theme = state.tema;
  if (!state.userId) { $('#app').innerHTML = telaLogin(); return; }
  const [rota, q = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [nome, arg] = rota.split('/'); const params = new URLSearchParams(q);
  let html = null;
  if (nome === 'inicio' || nome === '') html = telaInicio();
  else if (nome === 'dashboard') html = telaDashboard();
  else if (nome === 'meus') html = telaLista('meus', params);
  else if (nome === 'pendentes' && ehEquipe()) html = telaLista('pendentes', params);
  else if (nome === 'novo') html = telaNovo();
  else if (nome === 'chamado') html = telaChamado(Number(arg));
  else if (nome === 'modulo') html = telaModulo(arg);
  if (!html) { location.hash = '#/inicio'; return; }
  $('#app').innerHTML = html;
  if (nome === 'meus' || nome === 'pendentes') { filtrar(nome); ['f-q', 'f-st', 'f-pr'].forEach(i => $('#' + i).addEventListener('input', () => filtrar(nome))); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ================= Eventos ================= */
const atual = () => state.chamados.find(c => c.id === Number(location.hash.split('/')[2]));
const achar = id => state.chamados.find(c => c.id === Number(id));

document.addEventListener('click', async e => {
  const t = e.target;
  const lg = t.closest('[data-login]');
  if (lg) { state.userId = Number(lg.dataset.login); state.escopo = 'meus'; salvar(); location.hash = '#/inicio'; render(); return; }
  if (t.closest('#busca') && !t.closest('.busca-box')) { $('#busca').hidden = true; return; }

  const act = t.closest('[data-act]')?.dataset.act;
  if (act === 'menu') { document.body.classList.toggle('menu-on'); return; }
  if (act === 'fechar-menu') { document.body.classList.remove('menu-on'); return; }
  if (act === 'voltar') { history.length > 1 ? history.back() : (location.hash = '#/inicio'); return; }
  if (act === 'tema') { state.tema = state.tema === 'dark' ? 'light' : 'dark'; salvar(); render(); return; }
  if (act === 'busca') { abrirBusca(); return; }
  if (act === 'imprimir') { window.print(); return; }
  if (act === 'retorno') { state.retornoFeito = true; salvar(); render(); toast('Retorno marcado como feito'); return; }
  if (act === 'reset') {
    document.body.classList.remove('menu-on');
    if (await confirmar('Restaurar demo', 'Desfaz tudo o que você alterou e volta aos dados de exemplo.', 'Restaurar')) {
      const { userId, tema } = state; state = carregar.padrao(); Object.assign(state, { userId, tema }); salvar(); render(); toast('Dados de exemplo restaurados');
    }
    return;
  }
  if (act === 'sair') { state.userId = null; document.body.classList.remove('menu-on'); salvar(); location.hash = ''; render(); return; }

  const grp = t.closest('[data-grp]'); if (grp) { grp.parentElement.classList.toggle('open'); return; }
  const esc_ = t.closest('[data-escopo]'); if (esc_) { state.escopo = esc_.dataset.escopo; salvar(); render(); return; }
  const fab = t.closest('[data-href]'); if (fab) { location.hash = fab.dataset.href; return; }

  const conc = t.closest('[data-concluir]');
  if (conc) { const c = achar(conc.dataset.concluir); if (await confirmar('Concluir chamado', `Marcar o #${c.id} "${c.titulo}" como concluído?`, 'Concluir')) { mudarStatus(c, 'concluido'); render(); } return; }
  const ad = t.closest('[data-adiar]'); if (ad) { adiar(achar(ad.dataset.adiar)); render(); return; }

  const tag = t.closest('[data-tag]');
  if (tag && ehEquipe()) { const c = atual(), v = tag.dataset.tag; const tem = c.tags.includes(v); c.tags = tem ? c.tags.filter(x => x !== v) : [...c.tags, v]; registrar(c, `${tem ? 'removeu' : 'adicionou'} a etiqueta "${v}"`); salvar(); render(); return; }
  const rm = t.closest('[data-rmcheck]'); if (rm) { const c = atual(); const [i] = c.checklist.splice(Number(rm.dataset.rmcheck), 1); registrar(c, `removeu "${i.texto}" do checklist`); salvar(); render(); return; }

  const go = t.closest('[data-go]');
  if (go && !t.closest('a,button,input,label')) { $('#busca').hidden = true; document.body.classList.remove('menu-on'); location.hash = `#/chamado/${go.dataset.go}`; return; }
  if (t.closest('.sidebar a')) document.body.classList.remove('menu-on');
});

document.addEventListener('change', e => {
  const t = e.target, c = atual(); if (!c) return;
  const f = t.dataset.campo;
  if (f === 'status') { mudarStatus(c, t.value); render(); }
  else if (f === 'prioridade') { c.prioridade = t.value; registrar(c, `alterou a prioridade para ${PRIORIDADE[t.value]}`); salvar(); render(); toast('Prioridade atualizada'); }
  else if (f === 'prazo') { if (!t.value) return; c.prazo = new Date(t.value + 'T18:00:00').toISOString(); registrar(c, `alterou o prazo para ${fmtData(c.prazo)}`); salvar(); render(); toast('Prazo atualizado'); }
  else if (t.dataset.check !== undefined) { const i = c.checklist[Number(t.dataset.check)]; i.ok = t.checked; registrar(c, `${i.ok ? 'concluiu' : 'reabriu'} "${i.texto}"`); salvar(); render(); }
  else if (t.dataset.resp) {
    const id = Number(t.dataset.resp);
    c.responsaveis = t.checked ? [...c.responsaveis, id] : c.responsaveis.filter(x => x !== id);
    registrar(c, t.checked ? `atribuiu a ${primeiro(id)}` : `removeu ${primeiro(id)} dos responsáveis`);
    if (t.checked && c.status === 'pendente') { c.status = 'andamento'; registrar(c, 'alterou o status para Em andamento'); }
    salvar(); render(); toast('Responsáveis atualizados');
  }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (f.dataset.form === 'novo') {
    const titulo = d.titulo.trim(), descricao = d.descricao.trim();
    if (!titulo || !descricao) return toast('Preencha título e descrição', 'err');
    const em = new Date().toISOString(), id = Math.max(...state.chamados.map(c => c.id)) + 1;
    const resp = d.resp ? [Number(d.resp)] : [];
    const tl = [{ tipo: 'log', autor: state.userId, texto: 'abriu o chamado', em }];
    if (resp.length) tl.push({ tipo: 'log', autor: state.userId, texto: `atribuiu a ${primeiro(resp[0])}`, em });
    state.chamados.push({ id, titulo, descricao, cliente: d.cliente, prioridade: d.prioridade, status: resp.length ? 'andamento' : 'pendente', criadoEm: em,
      prazo: d.prazo ? new Date(d.prazo + 'T18:00:00').toISOString() : null, concluidoEm: null, atualizadoEm: em, solicitante: state.userId, responsaveis: resp, tags: [], checklist: [], timeline: tl });
    salvar(); toast(`Chamado #${id} aberto`); location.hash = `#/chamado/${id}`; return;
  }
  const c = atual(), txt = (d.t || '').trim(); if (!txt) return;
  if (f.dataset.form === 'comentario') { const em = new Date().toISOString(); c.timeline.push({ tipo: 'comentario', autor: state.userId, texto: txt, em }); c.atualizadoEm = em; toast('Comentário publicado'); }
  else { c.checklist.push({ texto: txt, ok: false }); registrar(c, `adicionou "${txt}" ao checklist`); }
  salvar(); render();
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && state.userId) { e.preventDefault(); abrirBusca(); }
  if (e.key === 'Escape') { $('#busca').hidden = true; if (!$('#modal').hidden) $('#modal-cancel').click(); document.body.classList.remove('menu-on'); }
  if (e.key === 'Enter' && !$('#busca').hidden) { const f = $('#busca-res [data-go]'); if (f) f.click(); }
});
document.addEventListener('input', e => { if (e.target.id === 'busca-in') buscar(e.target.value); });

/* ================= Ícones ================= */
const sv = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = {
  headset: sv('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>'),
  home: sv('<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>'),
  ticket: sv('<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9 6v12"/>'),
  gauge: sv('<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0z"/>'),
  plusc: sv('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  list: sv('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  file: sv('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  fileCheck: sv('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 15l2 2 4-4"/>'),
  barcode: sv('<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>'),
  chart: sv('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  bank: sv('<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>'),
  tools: sv('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  users: sv('<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  chat: sv('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  chatFill: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zM8 13.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/></svg>',
  dot: sv('<circle cx="12" cy="12" r="2.5"/>'),
  chev: sv('<path d="m6 9 6 6 6-6"/>'), chevR: sv('<path d="m9 6 6 6-6 6"/>'),
  out: sv('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  menu: sv('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  bell: sv('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  briefcase: sv('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  alarm: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M19 3l3 3"/>'),
  bolt: sv('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  ext: sv('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  check: sv('<path d="M20 6 9 17l-5-5"/>'),
  checkCircle: sv('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  cal: sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  alert: sv('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
  alertC: sv('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'),
  folder: sv('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  timer: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>'),
  code: sv('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  msg: sv('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  info: sv('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'),
  pencil: sv('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>'),
  print: sv('<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
  building: sv('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>'),
  listCheck: sv('<path d="M11 6h10M11 12h10M11 18h10M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>'),
  lock: sv('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
};

render();
