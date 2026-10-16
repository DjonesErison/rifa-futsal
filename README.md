# rifa-futsal

## Instalar a configuração da data do sorteio

Esta alteração depende de uma migração SQL. Sem ela, a página principal mantém
15/10/2026 e o admin informa que não conseguiu carregar a configuração; não há
confirmação falsa de salvamento. O SQL não foi aplicado pelo autor desta alteração.

1. No Supabase, confira que o projeto é `qlpnugxxhimnmazhopsj` (o mesmo das páginas).
2. No SQL Editor, execute o arquivo completo
   `supabase/migrations/202610160001_data_sorteio.sql` como `postgres`.
   A migração exige a função existente `public.eh_admin()` e não a substitui.
   É reaplicável sem sobrescrever uma data já salva.
3. Publique os arquivos desta alteração pelo fluxo habitual do GitHub Pages.
4. Entre no `admin.html`, altere **Data do sorteio** e clique em **Salvar**.
   Confirme a mensagem de sucesso e recarregue o admin para conferir persistência.
5. Abra `index.html`: deve exibir a mesma data em dia/mês/ano. Uma página já aberta
   consulta novamente a cada 30 segundos e ao voltar para a aba. A data não usa
   conversão de fuso horário. Falhas de leitura mantêm a última data exibida;
   na primeira abertura o fallback é 15/10/2026.

A tabela nova tem RLS habilitada e não concede acesso direto a `anon` nem
`authenticated`. A função de leitura retorna somente a data. A função de gravação
só concede execução a `authenticated` e exige `auth.uid()` e `eh_admin() = true`
no servidor. Nenhuma chave privilegiada é incluída nas páginas.

## Verificação após aplicar SQL

- Sem sessão: leitura da data deve funcionar; gravação e alteração direta da tabela
  devem ser negadas pela API.
- Com usuário autenticado que não seja administrador: gravação deve ser negada,
  inclusive chamando `salvar_data_sorteio_admin` diretamente pela API.
- Com administrador: salvar, recarregar e conferir a data nas duas páginas.
- Conferir reservas, confirmação de pagamento e bloqueio de PIX/WhatsApp até reservar.
  Use ambiente de teste para operações que alteram participações.

Não use o SQL Editor como prova de autorização de um usuário: a sessão `postgres`
é privilegiada. Os testes de permissão precisam usar os tokens reais de cada papel.

## Testes locais

Requer Node.js. Execute `node --test tests/draw-date.cjs`.
Os testes usam respostas simuladas e verificam o fluxo da data, erros, validade,
sintaxe dos scripts e preservação do código de reservas/pagamentos. Não substituem
o teste de integração e de autorização no Supabase após a migração.
