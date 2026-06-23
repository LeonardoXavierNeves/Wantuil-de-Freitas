import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Logo from '../components/Logo';
import Icon from '../components/Icon';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEnviando, setResetEnviando] = useState(false);
  const [mensagemReset, setMensagemReset] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try {
      await login(email, senha);
      nav('/');
    } catch (e: any) {
      setErro(e.response?.data?.message || 'E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  async function solicitarReset() {
    const dest = (email || '').trim();
    if (!dest) {
      setErro('Digite seu e-mail acima para receber o link de redefinição');
      return;
    }
    setErro(''); setMensagemReset(''); setResetEnviando(true);
    try {
      const { data } = await api.post('/auth/solicitar-reset', { email: dest });
      setMensagemReset(data.mensagem);
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao solicitar redefinição');
    } finally {
      setResetEnviando(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--wf-petroleo) 0%, var(--wf-petroleo-dk) 100%)',
      padding: 16,
    }}>
      <form onSubmit={entrar} style={{
        background: 'var(--surface)',
        width: '100%', maxWidth: 400,
        padding: '36px 32px 28px',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-block', marginBottom: 16 }}>
            <Logo variant="login" size={120} />
          </div>
          <div style={{
            fontSize: 13, color: 'var(--text-2)',
            paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 14,
          }}>
            Sistema de Gestão de Almoxarifado
          </div>
        </div>

        <label className="label">E-mail</label>
        <input className="input" type="email" required autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 14 }}
          placeholder="seu@email.com"
          autoComplete="username"
        />

        <label className="label">Senha</label>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <input className="input" type={mostrarSenha ? 'text' : 'password'} required
            value={senha} onChange={(e) => setSenha(e.target.value)}
            style={{ paddingRight: 40 }}
            placeholder="••••••"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', padding: 6,
              color: 'var(--text-3)', cursor: 'pointer',
            }} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
            <Icon name={mostrarSenha ? 'eye-off' : 'eye'} size={16} />
          </button>
        </div>

        {erro && (
          <div style={{
            padding: '10px 12px', borderRadius: 6,
            background: 'var(--r-50)', color: 'var(--r-600)',
            fontSize: 12, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="alert-circle" size={14} />{erro}
          </div>
        )}

        <button type="submit" className="btn primary" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14 }}>
          {loading ? <><span className="spinner" /> Entrando...</> : 'Entrar'}
        </button>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button type="button" onClick={solicitarReset} disabled={resetEnviando}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--primary-dk)', fontSize: 12, textDecoration: 'underline',
            }}>
            Esqueci minha senha
          </button>
        </div>

        {mensagemReset && (
          <div style={{
            marginTop: 10, padding: 10, borderRadius: 6,
            background: 'var(--green-bg)', color: 'var(--green)',
            fontSize: 11, textAlign: 'center', lineHeight: 1.4,
          }}>{mensagemReset}</div>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
          Associação Espírita Wantuil de Freitas · Cuiabá/MT
        </div>
      </form>
    </div>
  );
}
