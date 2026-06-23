import { useEffect, useState } from 'react';
import api from '../api/client';
import Icon from './Icon';
import { fmtData } from '../utils/format';

/**
 * Modal para adicionar lote manualmente em uma saida (sem ler etiqueta).
 *
 * Fluxo:
 * 1. Usuario escolhe o item no primeiro dropdown
 * 2. Sistema busca os lotes ATIVOS daquele item (com saldo > 0)
 * 3. Usuario escolhe o lote no segundo dropdown (mostra validade e saldo)
 * 4. Define quantidade
 * 5. Confirma -> componente pai recebe o lote completo via onLoteEncontrado
 *
 * O lote retornado tem o mesmo shape do que vem do ScannerLote, entao
 * o codigo de Saidas.adicionarLote(lote) funciona sem alteracao.
 */
interface Props {
  onLoteEncontrado: (lote: any) => void;
  onClose: () => void;
}

export default function AdicionarLoteManual({ onLoteEncontrado, onClose }: Props) {
  const [itens, setItens] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(true);
  const [carregandoLotes, setCarregandoLotes] = useState(false);
  const [itemId, setItemId] = useState('');
  const [loteId, setLoteId] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/itens').then(r => {
      setItens(r.data.filter((i: any) => i.ativo && Number(i.saldoAtual) > 0));
    }).finally(() => setCarregandoItens(false));
  }, []);

  // Carrega lotes do item selecionado
  useEffect(() => {
    if (!itemId) { setLotes([]); setLoteId(''); return; }
    setCarregandoLotes(true);
    api.get(`/lotes?itemId=${itemId}`).then(r => {
      // Apenas lotes ativos com saldo > 0, ordenados por validade ASC (mais próximos primeiro)
      const filtrados = r.data
        .filter((l: any) => l.ativo && Number(l.quantidadeAtual) > 0)
        .sort((a: any, b: any) => {
          if (!a.dataValidade) return 1;
          if (!b.dataValidade) return -1;
          return new Date(a.dataValidade).getTime() - new Date(b.dataValidade).getTime();
        });
      setLotes(filtrados);
      // Pré-seleciona o primeiro (mais próximo do vencimento - FEFO)
      if (filtrados.length > 0) setLoteId(filtrados[0].id);
      else setLoteId('');
    }).finally(() => setCarregandoLotes(false));
  }, [itemId]);

  const itensFiltrados = busca.trim()
    ? itens.filter(i =>
        i.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (i.codigoInterno || '').toLowerCase().includes(busca.toLowerCase()) ||
        (i.codigoBarras || '').includes(busca),
      )
    : itens;

  function confirmar() {
    if (!loteId) { setErro('Selecione um lote'); return; }
    const lote = lotes.find(l => l.id === loteId);
    if (!lote) { setErro('Lote nao encontrado'); return; }
    // Retorna no mesmo formato do ScannerLote pra reusar adicionarLote()
    onLoteEncontrado(lote);
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="pencil" size={18} color="var(--primary)" />
            <span className="modal-title">Adicionar lote manualmente</span>
          </div>
          <button className="btn icon sm ghost" onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.5 }}>
          Use esta opção quando a etiqueta estiver indisponível ou o item não tenha sido etiquetado.
          Escolha o item e o lote (ordenados por validade mais próxima).
        </div>

        {/* Busca de item */}
        <label className="label">Buscar item</label>
        <input className="input" placeholder="Nome, código interno ou código de barras"
          value={busca} onChange={(e) => setBusca(e.target.value)}
          style={{ marginBottom: 8 }} />

        {/* Dropdown de item */}
        <label className="label">Item *</label>
        <select className="select" value={itemId}
          onChange={(e) => { setItemId(e.target.value); setErro(''); }}
          style={{ marginBottom: 12 }}>
          <option value="">
            {carregandoItens ? 'Carregando…' : `Selecione um item (${itensFiltrados.length} disponíveis)`}
          </option>
          {itensFiltrados.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome} — saldo total: {i.saldoAtual} {i.unidadeMedida}
            </option>
          ))}
        </select>

        {/* Dropdown de lote (aparece quando item escolhido) */}
        {itemId && (
          <>
            <label className="label">Lote *</label>
            {carregandoLotes ? (
              <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--text-3)' }}>
                <span className="spinner" /> Carregando lotes…
              </div>
            ) : lotes.length === 0 ? (
              <div style={{
                padding: 10, borderRadius: 6, background: 'var(--a-50)',
                border: '1px solid var(--a-200)', fontSize: 12, color: 'var(--a-600)', marginBottom: 12,
              }}>
                Nenhum lote ativo com saldo encontrado para este item.
              </div>
            ) : (
              <select className="select" value={loteId}
                onChange={(e) => { setLoteId(e.target.value); setErro(''); }}
                style={{ marginBottom: 12 }}>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigoLote} · Val: {l.dataValidade ? fmtData(l.dataValidade) : 'sem validade'} · Saldo: {l.quantidadeAtual} un
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {/* Detalhe do lote selecionado */}
        {loteId && (() => {
          const l = lotes.find(x => x.id === loteId);
          if (!l) return null;
          return (
            <div style={{
              padding: 10, borderRadius: 6, background: 'var(--surface-2)',
              fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12,
            }}>
              <div><strong>Lote:</strong> {l.codigoLote}</div>
              <div><strong>Entrada:</strong> {fmtData(l.dataEntrada)}</div>
              {l.dataValidade && (
                <div><strong>Validade:</strong> {fmtData(l.dataValidade)} ({l.statusValidade || '—'})</div>
              )}
              <div><strong>Saldo do lote:</strong> {l.quantidadeAtual} un</div>
            </div>
          );
        })()}

        {erro && (
          <div style={{ padding: 8, borderRadius: 6, background: 'var(--r-50)', color: 'var(--r-600)', fontSize: 12, marginBottom: 12 }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={confirmar} disabled={!loteId}>
            <Icon name="check" size={14} /> Adicionar lote
          </button>
        </div>
      </div>
    </div>
  );
}
