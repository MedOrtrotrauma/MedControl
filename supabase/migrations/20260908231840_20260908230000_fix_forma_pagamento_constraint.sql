/*
# Corrigir constraint de forma_pagamento

1. Objetivo
- Incluir 'convenio' na lista de valores permitidos para forma_pagamento.
- O formulário usa 'convenio' como padrão, mas a constraint antiga não permitia.

2. Segurança
- Apenas remove e recria a check constraint, sem tocar em dados.
*/

ALTER TABLE public.repasses DROP CONSTRAINT IF EXISTS repasses_forma_pagamento_check;

ALTER TABLE public.repasses
  ADD CONSTRAINT repasses_forma_pagamento_check
  CHECK (forma_pagamento = ANY (ARRAY['credito'::text, 'pix'::text, 'debito'::text, 'especie'::text, 'convenio'::text]));
