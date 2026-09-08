/*
  # Criar usuário demo para autenticação

  1. Usuário Demo
    - Email: rayannyrego@gmail.com
    - Senha: Incom123
    - Confirmação automática de email
    - Perfil ativo para uso imediato

  2. Configurações
    - Email confirmado automaticamente
    - Usuário ativo no sistema
    - Pronto para fazer login
*/

-- Inserir usuário demo no sistema de autenticação do Supabase
-- Nota: Este é um exemplo de como seria feito. Na prática, o Supabase Auth
-- gerencia os usuários através de sua API própria, não diretamente no SQL.

-- Para criar o usuário, você deve usar o painel do Supabase ou a API:
-- 1. Vá para o painel do Supabase (https://app.supabase.com)
-- 2. Navegue até Authentication > Users
-- 3. Clique em "Add user"
-- 4. Preencha:
--    - Email: rayannyrego@gmail.com
--    - Password: Incom123
--    - Email Confirm: true (marque como confirmado)

-- Alternativamente, você pode usar a função de signup no frontend
-- que já está implementada no componente LoginForm.tsx

-- Esta migração serve como documentação do usuário demo criado
SELECT 'Usuário demo deve ser criado através do painel do Supabase Auth' as info;