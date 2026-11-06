// Dados 100% fictícios para a demonstração.
// Datas relativas ao dia de hoje, para a demo parecer sempre "viva".
const DEMO = (() => {
  const H = 3600e3, D = 24 * H;
  const now = Date.now();
  const ago = ms => new Date(now - ms).toISOString();
  const dia = n => { const d = new Date(); d.setHours(18, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); };

  const usuarios = [
    { id: 1, nome: 'Heitor Perdigão', perfil: 'admin' },
    { id: 2, nome: 'Lucas Martins', perfil: 'responsavel' },
    { id: 3, nome: 'Rafael Fontes', perfil: 'responsavel' },
    { id: 4, nome: 'Vinícius Hara', perfil: 'responsavel' },
    { id: 5, nome: 'Pedro Moraes', perfil: 'usuario' },
    { id: 6, nome: 'Leonardo Souza', perfil: 'usuario' },
  ];

  const clientes = [
    'FERRAGENS SÃO JORGE LTDA', 'MERCADO BOM PREÇO', 'AUTO PEÇAS ROTA 7', 'CLÍNICA BEM VIVER',
    'DISTRIBUIDORA NORTE SUL', 'PADARIA PÃO DOURADO', 'MATERIAIS PARA CONSTRUÇÃO ALIANÇA', 'ÓTICA VISÃO CLARA',
  ];

  const tagsDisponiveis = ['financeiro', 'fiscal', 'nf-e', 'relatório', 'impressora', 'acesso', 'treinamento', 'melhoria'];

  // [id, titulo, descricao, cliente, prioridade, status, criadoHaDias, prazoEmDias(null = sem prazo), solicitante, responsaveis, tags]
  const base = [
    [169, 'Gravar vídeos - Tutorial', 'Gravar os vídeos de tutorial do módulo financeiro para a base de conhecimento.', 2, 'media', 'andamento', 32, -25, 1, [1], ['treinamento']],
    [196, 'Relatório extra de vendas por vendedor', 'Cliente pediu relatório mensal agrupado por vendedor, com total e ticket médio.', 0, 'media', 'andamento', 12, -7, 2, [1, 2, 3], ['relatório']],
    [197, 'Relatório extra de comissões', 'Relatório de comissões por período, separado por forma de pagamento.', 1, 'media', 'pendente', 9, -4, 3, [1, 3], ['relatório', 'financeiro']],
    [199, 'Treinamento do caixa novo', 'Treinar a nova funcionária no fechamento de caixa e sangria.', 5, 'media', 'pendente', 2, 0, 1, [1], ['treinamento']],
    [200, 'Liberação de NFS-e - Nota fiscal de serviço', 'Configurar a emissão de nota de serviço para o município do cliente.', 4, 'alta', 'andamento', 3, 0, 1, [1, 2], ['fiscal', 'nf-e']],
    [201, 'Nota fiscal rejeitada com erro 539', 'Ao emitir a NF-e retorna rejeição 539 (duplicidade). Verificar se a nota foi autorizada.', 3, 'urgente', 'pendente', 0.2, 1, 5, [], ['fiscal', 'nf-e']],
    [202, 'Impressora do caixa não imprime cupom', 'Impressora térmica do caixa 2 parou desde a manhã. Já reiniciaram o computador.', 1, 'alta', 'pendente', 0.4, 1, 6, [], ['impressora']],
    [203, 'Boleto saindo com vencimento errado', 'Boletos estão saindo com 1 dia a menos no vencimento.', 6, 'alta', 'andamento', 1, 2, 5, [3], ['financeiro']],
    [204, 'Liberar acesso ao módulo financeiro', 'Novo funcionário precisa ver contas a pagar, sem permissão de excluir.', 7, 'baixa', 'pendente', 1, 5, 6, [4], ['acesso']],
    [42, 'Opção de alterar observação da nota', 'Permitir editar a observação da NF-e antes da transmissão.', 6, 'media', 'desenvolvimento', 40, null, 2, [1], ['melhoria', 'nf-e']],
    [107, 'Relatório de baixas por perfil', 'Relatório de baixas de títulos filtrando por perfil de usuário.', 3, 'media', 'desenvolvimento', 25, null, 3, [1, 3], ['relatório']],
    [111, 'Desenvolvimento de manutenção de pedidos', 'Tela para alterar pedidos já faturados, com histórico.', 4, 'alta', 'desenvolvimento', 22, null, 2, [1, 2], ['melhoria']],
    [117, 'Relatório extra de estoque mínimo', 'Listar produtos abaixo do estoque mínimo por fornecedor.', 4, 'baixa', 'desenvolvimento', 18, null, 4, [4], ['relatório']],
    [191, 'Ajuste do sistema online', 'Ajustar sincronização do catálogo online com o estoque.', 0, 'media', 'desenvolvimento', 14, null, 1, [1, 4], ['melhoria']],
    [185, 'Usuário bloqueado após trocar senha', 'A recepcionista trocou a senha e não consegue entrar.', 3, 'alta', 'concluido', 6, -5, 6, [2], ['acesso']],
    [186, 'Cadastrar forma de pagamento Pix', 'Incluir Pix como forma de pagamento no PDV.', 5, 'baixa', 'concluido', 8, -6, 5, [4], ['financeiro']],
    [187, 'Etiqueta cortando o preço', 'Na impressão de etiquetas o preço aparece cortado.', 7, 'media', 'concluido', 10, -8, 6, [3], ['impressora']],
    [188, 'Erro ao importar XML de fornecedor', 'XML da distribuidora não importa: "estrutura inválida".', 2, 'alta', 'concluido', 11, -9, 5, [1], ['fiscal']],
    [189, 'Ajustar alíquota de ICMS de produto', 'Produto com NCM 2106 saindo com alíquota antiga.', 4, 'media', 'concluido', 13, -10, 5, [2], ['fiscal']],
    [190, 'Fechamento de caixa com diferença', 'Fechamento apresentou diferença de R$ 12,40.', 1, 'alta', 'concluido', 15, -12, 6, [3], ['financeiro']],
    [160, 'Duplicidade no cadastro de clientes', 'Clientes duplicados com o mesmo CPF.', 0, 'baixa', 'arquivado', 45, -30, 5, [2], []],
  ];

  const nome = id => usuarios.find(u => u.id === id).nome.split(' ')[0];

  const chamados = base.map(b => {
    const [id, titulo, descricao, ci, prioridade, status, criado, prazo, solicitante, responsaveis, tags] = b;
    const criadoEm = ago(criado * D);
    const tl = [{ tipo: 'log', autor: solicitante, texto: 'abriu o chamado', em: criadoEm }];
    if (responsaveis.length) tl.push({ tipo: 'log', autor: 1, texto: `atribuiu a ${responsaveis.map(nome).join(', ')}`, em: ago(criado * D * 0.95) });
    if (status !== 'pendente') tl.push({ tipo: 'comentario', autor: responsaveis[0] || 1, texto: 'Recebido! Já estamos verificando e retornamos em breve.', em: ago(criado * D * 0.8) });
    if (['concluido', 'arquivado'].includes(status)) {
      tl.push({ tipo: 'comentario', autor: solicitante, texto: 'Funcionou, obrigado pelo atendimento!', em: ago(criado * D * 0.3) });
      tl.push({ tipo: 'log', autor: responsaveis[0] || 1, texto: status === 'concluido' ? 'concluiu o chamado' : 'arquivou o chamado', em: ago(criado * D * 0.25) });
    }
    const fim = ['concluido', 'arquivado'].includes(status);
    return {
      id, titulo, descricao, cliente: clientes[ci], prioridade, status, criadoEm,
      prazo: prazo === null ? null : dia(prazo),
      concluidoEm: fim ? ago(criado * D * 0.25) : null,
      atualizadoEm: tl[tl.length - 1].em,
      solicitante, responsaveis, tags,
      checklist: status === 'pendente' ? [] : [
        { texto: 'Reproduzir o problema', ok: true },
        { texto: 'Aplicar a correção', ok: fim },
        { texto: 'Validar com o cliente', ok: fim },
      ],
      timeline: tl,
    };
  });

  return { usuarios, clientes, tagsDisponiveis, chamados };
})();
