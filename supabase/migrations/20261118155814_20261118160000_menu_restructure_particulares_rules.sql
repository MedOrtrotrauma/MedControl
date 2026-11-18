/*
# Reestruturação do menu: fusão das telas de Particulares

1. Plain-English explanation
- O menu do sistema foi redesenhado. Os itens "Repasses cirurgias", "Particulares"
  e "Imagem" passam a ser menus de primeiro nível (sem grupo "Repasses"/"Imagem"/"Particulares").
- O antigo menu "Particulares" (que usava a tabela `repasses_particulares` via tela de
  produção mensal) deixa de existir. Todas as regras dele passam para o menu
  "Particulares" (tela de repasse particular), que lê e escreve na tabela `repasses`
  com o filtro `repasse_particular = true`.
- Regras de usuário transferidas: a recepção (tipo 'recepcao'), que acessava o antigo
  menu "Particulares", passa a ter o mesmo acesso pelo novo menu "Particulares",
  que opera sobre a tabela `repasses`. As policies de SELECT/INSERT/UPDATE/DELETE
  da tabela `repasses` são recriadas de forma idempotente para deixar explícito que
  qualquer usuário autenticado (administrativo, recepcao ou medico) mantém acesso
  completo — mesmo padrão já aplicado às demais tabelas do app.
- A tabela `repasses_particulares` NÃO é removida: os dados históricos permanecem
  preservados e acessíveis, mas deixa de ser usada pelas telas.

2. Modified tables
- `repasses`: policies recriadas (mesma semântica, agora explícitas) + grant completo
  para `authenticated`.

3. Security
- RLS de `repasses` permanece habilitado.
- Nenhuma permissão é reduzida; a regra da recepção passa a valer para a tabela
  `repasses`, que alimenta o menu Particulares.

4. Notes
- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE POLICY.
*/

GRANT SELECT, INSERT, UPDATE, DELETE ON repasses TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view repasses" ON repasses;
CREATE POLICY "Authenticated users can view repasses"
ON repasses FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert repasses" ON repasses;
CREATE POLICY "Authenticated users can insert repasses"
ON repasses FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update repasses" ON repasses;
CREATE POLICY "Authenticated users can update repasses"
ON repasses FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete repasses" ON repasses;
CREATE POLICY "Authenticated users can delete repasses"
ON repasses FOR DELETE
TO authenticated
USING (true);
