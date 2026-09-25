/*
# Corrigir recursão nas políticas de perfis_usuario — Vertebrare
#
# PROBLEMA: As políticas RLS em perfis_usuario fazem subconsulta na própria tabela,
# gerando recursão infinita e erro 500 no PostgREST.
#
# SOLUÇÃO: Criar funções SECURITY DEFINER que verificam o perfil sem disparar RLS,
# e reescrever todas as políticas para usar essas funções.
#
# COMO APLICAR: Execute este SQL no SQL Editor do seu projeto Supabase
# (ivrdcpzprsniiyaxpuhj) — Dashboard > SQL Editor > New query > colar e rodar.
#
# Nenhum dado é alterado ou apagado.
*/

-- ===== Funções auxiliares (SECURITY DEFINER = bypassam RLS) =====

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_usuario
    WHERE id = auth.uid() AND ativo AND tipo = 'administrativo'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_tipo()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT tipo FROM public.perfis_usuario WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_tipo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_tipo() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_medico_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT medico_id FROM public.perfis_usuario WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_medico_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_medico_id() TO authenticated;

-- ===== perfis_usuario: sem recursão =====

DROP POLICY IF EXISTS "perfil_select" ON public.perfis_usuario;
CREATE POLICY "perfil_select" ON public.perfis_usuario FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS "perfil_insert" ON public.perfis_usuario;
CREATE POLICY "perfil_insert" ON public.perfis_usuario FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "perfil_update" ON public.perfis_usuario;
CREATE POLICY "perfil_update" ON public.perfis_usuario FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "perfil_delete" ON public.perfis_usuario;
CREATE POLICY "perfil_delete" ON public.perfis_usuario FOR DELETE TO authenticated
USING (public.is_current_user_admin());

-- ===== repasses: usar funções em vez de subconsulta =====

DROP POLICY IF EXISTS "rep_select" ON public.repasses;
CREATE POLICY "rep_select" ON public.repasses FOR SELECT TO authenticated
USING (
  public.is_current_user_admin()
  OR (public.current_user_tipo() = 'recepcao' AND repasses.destinatario_tipo = 'terceiro')
  OR (public.current_user_tipo() = 'medico' AND repasses.medico_id = public.current_user_medico_id())
);

DROP POLICY IF EXISTS "rep_insert" ON public.repasses;
CREATE POLICY "rep_insert" ON public.repasses FOR INSERT TO authenticated
WITH CHECK (
  public.is_current_user_admin()
  OR (public.current_user_tipo() = 'recepcao' AND repasses.destinatario_tipo = 'terceiro')
);

DROP POLICY IF EXISTS "rep_update" ON public.repasses;
CREATE POLICY "rep_update" ON public.repasses FOR UPDATE TO authenticated
USING (
  public.is_current_user_admin()
  OR (public.current_user_tipo() = 'recepcao' AND repasses.destinatario_tipo = 'terceiro')
)
WITH CHECK (
  public.is_current_user_admin()
  OR (public.current_user_tipo() = 'recepcao' AND repasses.destinatario_tipo = 'terceiro')
);

DROP POLICY IF EXISTS "rep_delete" ON public.repasses;
CREATE POLICY "rep_delete" ON public.repasses FOR DELETE TO authenticated
USING (
  public.is_current_user_admin()
  OR (public.current_user_tipo() = 'recepcao' AND repasses.destinatario_tipo = 'terceiro')
);

-- ===== repasses_imagem =====

DROP POLICY IF EXISTS "img_select" ON public.repasses_imagem;
CREATE POLICY "img_select" ON public.repasses_imagem FOR SELECT TO authenticated
USING (
  public.is_current_user_admin()
  OR public.current_user_tipo() = 'recepcao'
  OR (public.current_user_tipo() = 'medico' AND repasses_imagem.medico_id = public.current_user_medico_id())
);

DROP POLICY IF EXISTS "img_insert" ON public.repasses_imagem;
CREATE POLICY "img_insert" ON public.repasses_imagem FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "img_update" ON public.repasses_imagem;
CREATE POLICY "img_update" ON public.repasses_imagem FOR UPDATE TO authenticated
USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "img_delete" ON public.repasses_imagem;
CREATE POLICY "img_delete" ON public.repasses_imagem FOR DELETE TO authenticated
USING (public.is_current_user_admin());

-- ===== Cadastros: usar função =====

-- medicos
DROP POLICY IF EXISTS "cad_insert_medicos" ON public.medicos;
CREATE POLICY "cad_insert_medicos" ON public.medicos FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_update_medicos" ON public.medicos;
CREATE POLICY "cad_update_medicos" ON public.medicos FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_delete_medicos" ON public.medicos;
CREATE POLICY "cad_delete_medicos" ON public.medicos FOR DELETE TO authenticated USING (public.is_current_user_admin());

-- convenios
DROP POLICY IF EXISTS "cad_insert_convenios" ON public.convenios;
CREATE POLICY "cad_insert_convenios" ON public.convenios FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_update_convenios" ON public.convenios;
CREATE POLICY "cad_update_convenios" ON public.convenios FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_delete_convenios" ON public.convenios;
CREATE POLICY "cad_delete_convenios" ON public.convenios FOR DELETE TO authenticated USING (public.is_current_user_admin());

-- hospitais
DROP POLICY IF EXISTS "cad_insert_hospitais" ON public.hospitais;
CREATE POLICY "cad_insert_hospitais" ON public.hospitais FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_update_hospitais" ON public.hospitais;
CREATE POLICY "cad_update_hospitais" ON public.hospitais FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_delete_hospitais" ON public.hospitais;
CREATE POLICY "cad_delete_hospitais" ON public.hospitais FOR DELETE TO authenticated USING (public.is_current_user_admin());

-- unidades
DROP POLICY IF EXISTS "cad_insert_unidades" ON public.unidades;
CREATE POLICY "cad_insert_unidades" ON public.unidades FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_update_unidades" ON public.unidades;
CREATE POLICY "cad_update_unidades" ON public.unidades FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_delete_unidades" ON public.unidades;
CREATE POLICY "cad_delete_unidades" ON public.unidades FOR DELETE TO authenticated USING (public.is_current_user_admin());

-- procedimentos
DROP POLICY IF EXISTS "cad_insert_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_insert_procedimentos" ON public.procedimentos FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_update_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_update_procedimentos" ON public.procedimentos FOR UPDATE TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "cad_delete_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_delete_procedimentos" ON public.procedimentos FOR DELETE TO authenticated USING (public.is_current_user_admin());
