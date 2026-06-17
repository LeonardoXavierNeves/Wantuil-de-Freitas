import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon from '../components/Icon';
import { fmtData } from '../utils/format';

interface LinhaLote {
  itemId: string;
  itemNome: string;
  unidade: string;
  quantidade: number;
  dataValidade: string;
  observacao: string;
}

export default function Entradas() {
  const [doadores, setDoadores] = useState<any[]>([]);
  const [doadorId, setDoadorId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [linhas, setLinhas] = useState<LinhaLote[]>([]);
  const [movs, setMovs] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState<any | null>(null);

  useEffect(() => {
    api.get('/doadores').then((r) => setDoadores(r.data));
    carregarMovs();
  }, []);

  useEffect(() => {
    if (busca.length < 2) { setSugestoes([]); return; }
    const t = setTimeout(() => {
      api.get('/itens', { params: { busca } }).then((r) => setSugestoes(r.data.slice(0, 5)));
    }, 200);
    return () => clearTimeout(t);
  }, [busca]);

  function carregarMovs() {
    api.get('/movimentacoes', { params: { tipo: 'ENTRADA' } }).then((r) => setMovs(r.data.slice(0, 6)));
  }

  function adicionarItem(i: any) {
    setLinhas([...linhas, {
      itemId: i.id, itemNome: i.nome, unidade: i.unidadeMedida,
      quantidade: 1, dataValidade: '', observacao: '',
    }]);
    setBusca(''); setSugestoes([]);
  }

  function atualizar(idx: number, dados: Partial<LinhaLote>) {
    const v = [...linhas]; v[idx] = { ...v[idx], ...dados }; setLinhas(v);
  }
  function remover(idx: number) { setLinhas(linhas.filter((_, i) => i !== idx)); }

  async function salvar() {
    if (!linhas.length) { setErro('Adicione ao menos um produto'); return; }
    setSalvando(true); setErro(''); setUltimoResultado(null);
    try {
      const { data } = await api.post('/movimentacoes/entrada', {
        doadorId: doadorId || undefined,
        observacao,
        lotes: linhas.map((l) => ({
          itemId: l.itemId,
          quantidade: l.quantidade,
          dataValidade: l.dataValidade || undefined,
          observacao: l.observacao || undefined,
        })),
      });
      setLinhas([]); setObservacao(''); setDoadorId('');
      setUltimoResultado(data);
      carregarMovs();
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao registrar');
    } finally { setSalvando(false); }
  }

  function imprimirEtiquetas(loteId: string, qtd: number) {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/etiquetas/lote/${loteId}?qtd=${qtd}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((b) => window.open(URL.createObjectURL(b), '_blank'));
  }

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 18 }} className="desktop-only">
        Entradas — Doações Recebidas
      </h2>

      <div className="grid-2">
        {/* ── Form ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Icon name="arrow-down" size={16} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Registrar nova entrada</span>
          </div>

          <label className="label">Doador</label>
          <select className="select" value={doadorId}
            onChange={(e) => setDoadorId(e.target.value)} style={{ marginBottom: 14 }}>
            <option value="">Doação avulsa (sem doador)</option>
            {doadores.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>

          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Produtos a cadastrar (cada linha = 1 lote)
            </div>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input className="input" placeholder="Buscar produto pelo nome ou código…"
                value={busca} onChange={(e) => setBusca(e.target.value)} />
              {sugestoes.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                  background: 'var(--surface)', border: '1px solid var(--border-2)',
                  borderRadius: 6, zIndex: 10, maxHeight: 220, overflowY: 'auto',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                }}>
                  {sugestoes.map((s) => (
                    <div key={s.id} onClick={() => adicionarItem(s)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        Saldo atual: {s.saldoAtual} {s.unidadeMedida}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {linhas.length === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                Nenhum produto adicionado. Busque acima para começar.
              </div>
            )}

            {linhas.map((l, idx) => (
              <div key={idx} style={{
                background: 'var(--surface-2)', borderRadius: 6, padding: 10, marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.itemNome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                      1 lote será criado com a quantidade abaixo
                    </div>
                  </div>
                  <button className="btn icon sm" onClick={() => remover(idx)} title="Remover">
                    <Icon name="x" size={13} />
                  </button>
                </div>
                <div className="grid-2" style={{ gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 2 }}>
                      Quantidade ({l.unidade})
                    </div>
                    <input className="input" type="number" min="1" step="any" value={l.quantidade}
                      onChange={(e) => atualizar(idx, { quantidade: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 2 }}>
                      Validade (opcional)
                    </div>
                    <input className="input" type="date" value={l.dataValidade}
                      onChange={(e) => atualizar(idx, { dataValidade: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <label className="label">Observações da entrada</label>
          <textarea className="input" rows={2} value={observacao}
            onChange={(e) => setObservacao(e.target.value)} style={{ marginBottom: 14, resize: 'vertical' }} />

          {erro && (
            <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--r-50)',
              color: 'var(--r-600)', fontSize: 12, marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert-circle" size={14} />{erro}
            </div>
          )}

          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={salvar} disabled={salvando}>
            {salvando ? <><span className="spinner" /> Salvando</> : <><Icon name="check" size={14} /> Confirmar entrada</>}
          </button>

          {/* Lotes recém-criados com botão de etiqueta */}
          {ultimoResultado && ultimoResultado.itens?.length > 0 && (
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 8,
              background: 'var(--green-bg)', border: '1px solid var(--green)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 8 }}>
                Entrada registrada — imprimir etiquetas:
              </div>
              {ultimoResultado.itens.map((mi: any) => mi.lote && (
                <div key={mi.lote.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{mi.item.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                      {mi.lote.codigoLote} · {mi.quantidade} {mi.item.unidadeMedida}
                    </div>
                  </div>
                  <button className="btn sm primary" onClick={() => imprimirEtiquetas(mi.lote.id, Math.ceil(Number(mi.quantidade)))}>
                    <Icon name="tag" size={13} /> {Math.ceil(Number(mi.quantidade))} etiqueta(s)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Histórico ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="file-text" size={16} color="var(--primary)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Entradas recentes</span>
          </div>
          {movs.length === 0 ? (
            <div className="empty-state">
              <Icon name="arrow-down" size={28} color="var(--text-3)" style={{ margin: '0 auto 8px' }} />
              <div className="empty-state-title">Sem entradas recentes</div>
            </div>
          ) : movs.map((m) => (
            <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {m.itens.map((mi: any) => mi.item.nome).join(', ')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>
                  +{m.itens.reduce((s: number, mi: any) => s + Number(mi.quantidade), 0)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                {m.doador?.nome || 'Doação avulsa'} · {fmtData(m.dataMovimentacao)} · {m.usuario.nome}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
