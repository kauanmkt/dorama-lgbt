-- =====================================================================
--  REMOVER DADOS DE DEMONSTRAÇÃO
--  Apaga os doramas fictícios (com temporadas e episódios) e os planos de exemplo.
--  As categorias ficam — edite ou exclua pelo painel se quiser.
-- =====================================================================
begin;
delete from public.doramas where slug in (
  'amor-em-seul',
  'ceu-de-bangkok',
  'duas-luas',
  'segredo-do-campus',
  'cafe-das-7',
  'melodia-proibida',
  'luz-de-neon',
  'petalas-de-outono',
  'promessa-de-verao',
  'jardim-de-inverno',
  'linhas-cruzadas',
  'tinta-e-seda',
  'entre-ondas',
  'ultimo-trem'
);
delete from public.plans p
where p.name in ('Mensal', 'Trimestral', 'Anual', 'Vitalício')
  and not exists (select 1 from public.subscriptions s where s.plan_id = p.id);
commit;
