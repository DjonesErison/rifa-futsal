# Diagnóstico — 15/10/2026

## Evidência confirmada

- GitHub Pages responde HTTP 200. O JavaScript da página pública executa e cria 500 botões.
- O host configurado em ambas as páginas, `qlpnugxxhimnmazhopsj.supabase.co`, não resolve localmente. Consulta independente ao Google Public DNS retornou `Status: 3` (NXDOMAIN).
- O navegador registrou erro ao consultar os estados. O código anterior apenas escrevia no console e mantinha todos os botões inicialmente disponíveis, criando aparência de perda de reservas/pagamentos.
- O código reconhece `reservado` e `pago`. Valores desconhecidos, respostas vazias ou parciais não eram tratados como falha.
- Ambas as páginas chamavam `liberar_reservas_vencidas` durante leitura. Na página pública, erros retornados pelo SDK nessa RPC eram ignorados, pois normalmente são retornados em `error`, sem exceção.
- O histórico inteiro contém somente HTML, imagem e README. Não há definição SQL da view, funções, políticas RLS, gatilhos ou agendamentos.

## Limites

Não há evidência de exclusão efetiva de registros. Não foi possível consultar o banco por causa do DNS, nem inspecionar SQL de expiração/confirmar pagamento. Não é possível atribuir a falha a pausa, remoção do projeto ou URL incorreta sem acesso ao painel Supabase. Nenhuma RPC foi chamada manualmente; a visita de diagnóstico ao site executou o carregamento existente, que tenta a RPC de expiração, mas o host não resolveu. Não houve reserva de teste, alteração de pagamento ou exclusão.

## Correção proposta

- Bloquear seleção e reserva enquanto a disponibilidade não for verificada; mostrar aviso de carregamento/erro e estado cinza desconhecido.
- Validar snapshot completo dos 500 números, identificadores únicos e estados conhecidos antes de aplicá-lo.
- Bloquear seleção em falhas de atualização, preservando classes de pago/reservado. Reconsultar a cada 30 segundos.
- Remover chamadas de expiração das duas páginas. Isso altera a limpeza automática disparada pelos visitantes: antes de mesclar, revisar a expiração no servidor e definir sua execução segura. Não foi criado agendamento nem alterada função no banco.
- Preservar o link WhatsApp da reserva confirmada durante atualizações, em vez de substituí-lo por `#` ao limpar a seleção.

## Próximas verificações no Supabase (somente leitura)

1. Verificar existência/estado do projeto e URL oficial; comparar antes de substituir a configuração. Não criar banco vazio para mascarar ausência do original.
2. Consultar contagem por estado em `numeros_publicos` e comparar com tabelas de origem, comprovantes e histórico disponível.
3. Inspecionar definição de `liberar_reservas_vencidas`: deve atingir somente `status = 'reservado'` com `expira_em < now()` e nunca pagos. Inspecionar também views, triggers e cron.
4. Inspecionar `confirmar_pagamento`, `reservar_numeros`, funções de liberação/exclusão e RLS. Reservas concorrentes precisam ser atômicas no servidor; pagamentos devem exigir administrador.
5. Se houver registros ausentes, avaliar logs/backups antes de qualquer restauração. Exigir autorização para recuperação ou alterações em pagamentos.

## Testes

`node --test tests/status.test.cjs`: 11 testes aprovados, sem acesso ao banco. Cobrem snapshot completo, pagos/reservados, seleção disponível, lista vazia/parcial/duplicada, estado inválido, erro de API/rede/CDN, recuperação após falha, ausência de RPC de expiração no carregamento e sintaxe dos dois scripts. Não validam SQL/RLS nem pagamentos reais.
