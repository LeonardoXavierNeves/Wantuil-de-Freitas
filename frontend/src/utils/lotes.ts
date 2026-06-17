// Espelha a logica do backend (calcularStatusLote em lotes.service.ts)
// para que o frontend possa exibir status corretamente sem chamar API a cada vez.

export interface StatusLote {
  label: string;
  cor: 'green' | 'amber' | 'orange' | 'red' | 'neutral';
}

export const STATUS_VALIDADE_LOTE: Record<string, StatusLote> = {
  VIGENTE:   { label: 'Vigente',          cor: 'green'   },
  PROXIMO:   { label: 'Próximo do venc.', cor: 'amber'   },
  ADICIONAL: { label: 'Período adicional',cor: 'orange'  },
  DESCARTE:  { label: 'Para descarte',    cor: 'red'     },
};

export function calcularStatusValidade(dataValidade: string | Date | null | undefined): string {
  if (!dataValidade) return 'VIGENTE';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const val = new Date(dataValidade); val.setHours(0, 0, 0, 0);

  const seisMesesDepois = new Date(val);
  seisMesesDepois.setMonth(seisMesesDepois.getMonth() + 6);
  const trintaDiasAntes = new Date(val);
  trintaDiasAntes.setDate(trintaDiasAntes.getDate() - 30);

  if (hoje > seisMesesDepois) return 'DESCARTE';
  if (hoje > val) return 'ADICIONAL';
  if (hoje >= trintaDiasAntes) return 'PROXIMO';
  return 'VIGENTE';
}

export function fmtCodigoLote(codigo: string): string {
  // L-20260616-0042 → "L-2026/06/16 #0042" mais legivel? Por enquanto retorna como esta.
  return codigo;
}
