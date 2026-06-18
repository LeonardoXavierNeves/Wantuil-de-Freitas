import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import api from '../api/client';
import Icon from './Icon';

interface Props {
  onClose: () => void;
  onLoteEncontrado: (lote: any) => void;
}

type Estado = 'idle' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'esgotado';

/**
 * Scanner de etiquetas de LOTE (não EAN de produto).
 * Le códigos no formato L-AAAAMMDD-NNNN gravados nas etiquetas via Code128.
 */
export default function ScannerLote({ onClose, onLoteEncontrado }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [resultado, setResultado] = useState<any>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!cameraAtiva || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let controls: any;
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result) {
        const c = result.getText();
        setCodigo(c);
        buscar(c);
        controls?.stop();
        setCameraAtiva(false);
      }
    }).then((c) => { controls = c; });
    return () => controls?.stop();
  }, [cameraAtiva]);

  async function buscar(c?: string) {
    const cod = (c || codigo).trim().toUpperCase();
    if (!cod) return;
    setEstado('buscando'); setErro('');
    try {
      const { data } = await api.get(`/lotes/codigo/${encodeURIComponent(cod)}`);
      if (!data.encontrado) {
        setEstado('nao_encontrado');
        setResultado(null);
        return;
      }
      if (data.esgotado) {
        setEstado('esgotado');
        setResultado(data.lote);
        return;
      }
      setEstado('encontrado');
      setResultado(data.lote);
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao buscar');
      setEstado('idle');
    }
  }

  function confirmar() {
    if (resultado) {
      onLoteEncontrado(resultado);
      onClose();
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="barcode" size={18} color="var(--primary)" />
            <span className="modal-title">Ler etiqueta de lote</span>
          </div>
          <button className="btn icon sm ghost" onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={16} />
          </button>
        </div>

        {cameraAtiva ? (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <video ref={videoRef} style={{ width: '100%', borderRadius: 8, background: '#000' }} />
            <div style={{
              position: 'absolute', top: '50%', left: '10%', right: '10%', height: 2,
              background: 'var(--wf-amarelo)', boxShadow: '0 0 12px var(--wf-amarelo)',
            }} />
          </div>
        ) : (
          <div style={{
            background: 'var(--primary-bg)', border: '1px dashed var(--primary-lt)',
            borderRadius: 8, padding: '20px 16px', textAlign: 'center', marginBottom: 14,
          }}>
            <Icon name="barcode" size={32} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
              Escaneie a etiqueta ou digite o código (ex: L-20260616-0042)
            </div>
            <input className="input" placeholder="L-AAAAMMDD-NNNN" autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => buscar()} disabled={estado === 'buscando' || !codigo}>
            {estado === 'buscando'
              ? <><span className="spinner" /> Buscando…</>
              : <><Icon name="search" size={14} /> Localizar lote</>}
          </button>
          <button className="btn" onClick={() => setCameraAtiva(!cameraAtiva)}>
            <Icon name="camera" size={14} />{cameraAtiva ? 'Parar' : 'Câmera'}
          </button>
        </div>

        {erro && (
          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--r-50)',
            color: 'var(--r-600)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="alert-circle" size={14} /> {erro}
          </div>
        )}

        {estado === 'encontrado' && resultado && (
          <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)',
            borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <Icon name="check" size={12} /> Lote localizado
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{resultado.item.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace', marginBottom: 6 }}>
              {resultado.codigoLote}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
              <div><strong>Saldo no lote:</strong> {resultado.quantidadeAtual} {resultado.item.unidadeMedida}</div>
              {(resultado.reservadoTotal || 0) > 0 && (
                <>
                  <div style={{ color: 'var(--a-600)' }}>
                    <strong>Reservado em eventos:</strong> {resultado.reservadoTotal} {resultado.item.unidadeMedida}
                  </div>
                  <div style={{ color: 'var(--green)' }}>
                    <strong>Disponível p/ saída:</strong> {resultado.disponivel} {resultado.item.unidadeMedida}
                  </div>
                </>
              )}
              {resultado.dataValidade && (
                <div><strong>Validade:</strong> {new Date(resultado.dataValidade).toLocaleDateString('pt-BR')}</div>
              )}
              {resultado.doador && <div><strong>Doador:</strong> {resultado.doador.nome}</div>}
            </div>
            <button className="btn primary sm" onClick={confirmar} style={{ marginTop: 12 }}>
              <Icon name="check" size={13} /> Usar este lote
            </button>
          </div>
        )}

        {estado === 'esgotado' && resultado && (
          <div style={{ background: 'var(--a-50)', border: '1px solid var(--a-200)',
            borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="alert-triangle" size={14} color="var(--a-600)" />
              <span style={{ fontWeight: 600, color: 'var(--a-600)', fontSize: 12 }}>
                Lote já esgotado
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              O lote <strong>{resultado.codigoLote}</strong> de "{resultado.item.nome}" já foi
              totalmente consumido. Procure outro lote do mesmo produto.
            </div>
          </div>
        )}

        {estado === 'nao_encontrado' && (
          <div style={{ background: 'var(--r-50)', border: '1px solid var(--r-600)',
            borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="alert-circle" size={14} color="var(--r-600)" />
              <span style={{ fontWeight: 600, color: 'var(--r-600)', fontSize: 12 }}>
                Etiqueta não encontrada
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Verifique se a etiqueta está bem impressa ou se o código foi digitado corretamente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
