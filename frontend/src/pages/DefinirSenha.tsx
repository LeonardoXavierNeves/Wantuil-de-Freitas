import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import Logo from '../components/Logo';
import Icon from '../components/Icon';

/**
 * Tela publica /definir-senha?token=...
 * Acessivel sem login. Usada em dois fluxos:
 * - Convite ao novo usuario (link enviado pelo admin)
 * - Reset de senha esquecida
 */
export default function DefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const nav = useNavigate();

  const [estado, setEstado] = useState<'validando' | 'ok' | 'invalido'>('validando');
  const [info, setInfo] = useState<{ nome: string; email: string; tipo: string } | null>(null);
  const [erro, setErro] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      setErro('Link inválido. Confira o e-mail que você recebeu.');
      return;
    }
    api.get(`/auth/validar-token?token=${encodeURIComponent(token)}`)
      .then((r) => {
        setInfo(r.data);
        setEstado('ok');
      })
      .catch((e) => {
        setEstado('invalido');
        setErro(e.response?.data?.message || 'Link inválido ou expirado.');
      });
  }, [token]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) { setErro('Senha precisa ter ao menos 6 caracteres'); return; }
    if (senha !== confirma) { setErro('As senhas não coincidem'); return; }

    setEnviando(true);
    try {
      await api.post('/auth/definir-senha', { token, senha });
      setSucesso(true);
      setTimeout(() => nav('/login'), 2500);
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao definir senha');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'var(--nav-bg)',
    }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: 28 }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <Logo />
        </div>

        {estado === 'validando' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span className="spinner" /> Validando link…
          </div>
        )}

        {estado === 'invalido' && (
          <>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <Icon name="alert-circle" size={36} color="var(--r-600)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Link inválido</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{erro}</div>
            </div>
            <Link to="/login" className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
              Voltar para o login
            </Link>
          </>
        )}

        {estado === 'ok' && info && !sucesso && (
          <form onSubmit={salvar}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Olá, <strong>{info.nome}</strong></div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{info.email}</div>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                {info.tipo === 'CONVITE'
                  ? 'Sua conta foi criada. Defina uma senha para começar a usar o sistema.'
                  : 'Crie uma nova senha para sua conta.'}
              </div>
            </div>

            <label className="label">Nova senha *</label>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input className="input" type={mostrar ? 'text' : 'password'} minLength={6}
                required value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres" style={{ paddingRight: 38 }} />
              <button type="button" onClick={() => setMostrar(!mostrar)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', padding: 6, color: 'var(--text-3)' }}>
                <Icon name={mostrar ? 'eye-off' : 'eye'} size={14} />
              </button>
            </div>

            <label className="label">Confirmar senha *</label>
            <input className="input" type={mostrar ? 'text' : 'password'} minLength={6}
              required value={confirma} onChange={(e) => setConfirma(e.target.value)}
              style={{ marginBottom: 12 }} />

            {erro && (
              <div style={{ padding: 8, borderRadius: 6, background: 'var(--r-50)',
                color: 'var(--r-600)', fontSize: 12, marginBottom: 12 }}>{erro}</div>
            )}

            <button type="submit" className="btn primary" disabled={enviando}
              style={{ width: '100%', justifyContent: 'center' }}>
              {enviando ? <><span className="spinner" /> Salvando…</> : 'Definir senha e entrar'}
            </button>
          </form>
        )}

        {sucesso && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Icon name="check-circle" size={42} color="var(--green)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Senha definida!</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Redirecionando para o login…</div>
          </div>
        )}
      </div>
    </div>
  );
}
