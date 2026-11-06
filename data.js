// Dados 100% fictícios para a demonstração.
// As datas são geradas em relação ao momento atual, para a demo parecer sempre "viva".
const DEMO = (() => {
  const H = 3600e3, D = 24 * H;
  const now = Date.now();
  const ago = ms => new Date(now - ms).toISOString();

  const usuarios = [
    { id: 1, nome: 'Ana Souza', perfil: 'admin', cor: '#8B5CF6' },
    { id: 2, nome: 'Bruno Lima', perfil: 'responsavel', cor: '#0EA5E9' },
    { id: 3, nome: 'Carla Mendes', perfil: 'responsavel', cor: '#F59E0B' },
    { id: 4, nome: 'Diego Rocha', perfil: 'usuario', cor: '#10B981' },
    { id: 5, nome: 'Elisa Prado', perfil: 'usuario', cor: '#EC4899' },
  ];

  const clientes = [
    'Padaria Pão Dourado', 'Clínica Bem Viver', 'Auto Peças Rota 7', 'Mercado Bom Preço',
    'Ótica Visão Clara', 'Academia Movimento', 'Pet Shop Patinhas', 'Escritório Contábil Exato',
  ];

  const tagsDisponiveis = ['financeiro', 'fiscal', 'impressora', 'rede', 'cadastro', 'relatório', 'acesso', 'melhoria'];

  // [titulo, descricao, cliente, prioridade, status, idadeMs, solicitante, responsaveis, tags]
  const base = [
    ['Nota fiscal rejeitada com erro 539', 'Ao emitir a NF-e o sistema retorna rejeição 539 (duplicidade). Precisamos entender se a nota foi autorizada.', 0, 'urgente', 'andamento', 2 * H, 4, [2], ['fiscal']],
    ['Impressora do caixa não imprime cupom', 'Desde a manhã a impressora térmica do caixa 2 não responde. Já reiniciamos o computador.', 3, 'alta', 'pendente', 5 * H, 5, [], ['impressora']],
    ['Relatório de vendas por vendedor', 'Gostaríamos de um relatório mensal de vendas agrupado por vendedor, com total e ticket médio.', 1, 'media', 'desenvolvimento', 3 * D, 4, [3], ['relatório', 'melhoria']],
    ['Usuário bloqueado após trocar senha', 'A recepcionista trocou a senha e agora não consegue entrar.', 1, 'alta', 'concluido', 2 * D, 5, [2], ['acesso']],
    ['Erro ao importar XML de fornecedor', 'O XML da distribuidora não importa: mensagem "estrutura inválida".', 2, 'media', 'andamento', 30 * H, 4, [2, 3], ['fiscal', 'cadastro']],
    ['Lentidão no sistema à tarde', 'Entre 14h e 17h o sistema fica muito lento em todas as máquinas.', 4, 'alta', 'pendente', 26 * H, 5, [], ['rede']],
    ['Cadastrar nova forma de pagamento (Pix)', 'Precisamos da forma de pagamento Pix no PDV.', 0, 'baixa', 'concluido', 6 * D, 4, [3], ['financeiro', 'cadastro']],
    ['Boleto saindo com vencimento errado', 'Os boletos estão saindo com 1 dia a menos no vencimento.', 7, 'urgente', 'pendente', 3 * H, 5, [], ['financeiro']],
    ['Integração com balança', 'Balança nova da padaria não está sendo reconhecida.', 0, 'media', 'desenvolvimento', 5 * D, 4, [2], ['melhoria']],
    ['Fechamento de caixa com diferença', 'O fechamento de ontem apresentou diferença de R$ 12,40 sem explicação.', 3, 'alta', 'andamento', 20 * H, 5, [3], ['financeiro']],
    ['Liberar acesso ao módulo financeiro', 'Novo funcionário precisa ver contas a pagar, sem permissão de excluir.', 7, 'baixa', 'pendente', 4 * D, 4, [], ['acesso']],
    ['Etiqueta de produto cortando o preço', 'Na impressão de etiquetas o preço aparece cortado na última linha.', 6, 'media', 'concluido', 8 * D, 5, [2], ['impressora']],
    ['Backup automático não rodou', 'O aviso de backup mostra que o último foi há 3 dias.', 5, 'urgente', 'concluido', 9 * D, 4, [2], ['rede']],
    ['Ajustar alíquota de ICMS de produto', 'Produto com NCM 2106 está saindo com alíquota antiga.', 2, 'media', 'pendente', 50 * H, 5, [], ['fiscal']],
    ['Wi-fi caindo na recepção', 'A conexão da recepção cai várias vezes por dia.', 1, 'baixa', 'andamento', 7 * D, 4, [3], ['rede']],
    ['Relatório de aniversariantes do mês', 'Queremos enviar mensagem aos clientes aniversariantes.', 6, 'baixa', 'desenvolvimento', 10 * D, 5, [3], ['relatório', 'melhoria']],
    ['Duplicidade no cadastro de clientes', 'Há clientes duplicados com o mesmo CPF.', 4, 'media', 'arquivado', 20 * D, 4, [2], ['cadastro']],
    ['Comprovante de venda sem logo', 'Depois da atualização a logo sumiu do comprovante.', 5, 'baixa', 'concluido', 12 * D, 5, [3], ['impressora']],
  ];

  const nomes = id => usuarios.find(u => u.id === id).nome;

  const chamados = base.map((b, i) => {
    const [titulo, descricao, ci, prioridade, status, idade, solicitante, responsaveis, tags] = b;
    const criadoEm = ago(idade);
    const timeline = [{ tipo: 'log', autor: solicitante, texto: 'abriu o chamado', em: criadoEm }];
    if (responsaveis.length) timeline.push({ tipo: 'log', autor: 1, texto: `atribuiu a ${responsaveis.map(nomes).join(', ')}`, em: ago(idade * 0.9) });
    if (status !== 'pendente') {
      timeline.push({ tipo: 'comentario', autor: responsaveis[0] || 1, texto: 'Recebido! Já estamos verificando e retornamos em breve.', em: ago(idade * 0.8) });
    }
    if (['concluido', 'arquivado'].includes(status)) {
      timeline.push({ tipo: 'comentario', autor: solicitante, texto: 'Funcionou, obrigado pelo atendimento!', em: ago(idade * 0.3) });
      timeline.push({ tipo: 'log', autor: responsaveis[0] || 1, texto: `alterou o status para ${status === 'concluido' ? 'Concluído' : 'Arquivado'}`, em: ago(idade * 0.25) });
    }
    const checklist = status === 'pendente' ? [] : [
      { texto: 'Reproduzir o problema', ok: true },
      { texto: 'Aplicar a correção', ok: ['concluido', 'arquivado'].includes(status) },
      { texto: 'Validar com o cliente', ok: ['concluido', 'arquivado'].includes(status) },
    ];
    return {
      id: 1001 + i, titulo, descricao, cliente: clientes[ci], prioridade, status,
      criadoEm, atualizadoEm: timeline[timeline.length - 1].em,
      concluidoEm: ['concluido', 'arquivado'].includes(status) ? ago(idade * 0.25) : null,
      solicitante, responsaveis, tags, checklist, timeline,
    };
  });

  return { usuarios, clientes, tagsDisponiveis, chamados };
})();
