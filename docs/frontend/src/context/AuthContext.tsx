import { createContext, useContext, useState, ReactNode } from 'react';
import api from '../api/client';

interface Usuario { id: string; nome: string; email: string; perfil: string }

interface AuthCtx {
  usuario: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  podeFazer: (acao: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null!);

// Matriz de permissoes — deve espelhar o backend (PerfilGuard + @Perfis)
//
// Niveis:
// - MASTER: dono do sistema (dev). Tudo + logs + diagnostico + reset.
// - ADMIN: diretoria. Tudo do dia-a-dia + gestao de usuarios.
// - ALMOXARIFE: operacao. Entradas, saidas, descartes, eventos, cadastro de itens.
// - GESTOR: leitura + relatorios.
// - OPERADOR: apenas saidas (voluntario de evento).
const PERMISSOES: Record<string, string[]> = {
  // Itens
  'itens.criar':        ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'itens.editar':       ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'itens.excluir':      ['MASTER', 'ADMIN'],

  // Movimentacoes
  'mov.entrada':        ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'mov.saida':          ['MASTER', 'ADMIN', 'ALMOXARIFE', 'OPERADOR'],
  'mov.descarte':       ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'mov.estorno':        ['MASTER', 'ADMIN'],

  // Cadastros auxiliares
  'doadores.ver':       ['MASTER', 'ADMIN', 'ALMOXARIFE', 'GESTOR'],
  'doadores.criar':     ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'doadores.editar':    ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'doadores.excluir':   ['MASTER', 'ADMIN'],
  'benef.criar':        ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'benef.editar':       ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'benef.excluir':      ['MASTER', 'ADMIN'],

  // Estrutura
  'setores.gerenciar':    ['MASTER', 'ADMIN'],
  'categorias.gerenciar': ['MASTER', 'ADMIN'],
  'usuarios.gerenciar':   ['MASTER', 'ADMIN'],
  'usuarios.master':      ['MASTER'], // so MASTER cria/edita outros MASTERs

  // Eventos
  'eventos.criar':      ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'eventos.editar':     ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'eventos.excluir':    ['MASTER', 'ADMIN'],
  'eventos.cancelar':   ['MASTER', 'ADMIN'],
  'eventos.iniciar':    ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'eventos.finalizar':  ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'eventos.reservar':   ['MASTER', 'ADMIN', 'ALMOXARIFE'],
  'eventos.baixar':     ['MASTER', 'ADMIN', 'ALMOXARIFE', 'OPERADOR'],

  // Relatorios e auditoria
  'relatorios.ver':     ['MASTER', 'ADMIN', 'ALMOXARIFE', 'GESTOR'],
  'auditoria.ver':      ['MASTER'], // apenas MASTER ve logs tecnicos
  'auditoria.exportar': ['MASTER'],

  // Configuracoes
  'config.geral':       ['MASTER', 'ADMIN'], // abas Usuarios, Categorias, Notificacoes-geral
  'config.sistema':     ['MASTER'], // aba Sistema (reset, limpar exemplos)
  'config.email-teste': ['MASTER'], // botoes de testar email / diagnostico Resend
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email: string, senha: string) {
    const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), senha });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  function podeFazer(acao: string): boolean {
    if (!usuario) return false;
    const perfisPermitidos = PERMISSOES[acao];
    if (!perfisPermitidos) return false;
    return perfisPermitidos.includes(usuario.perfil);
  }

  return <Ctx.Provider value={{ usuario, login, logout, podeFazer }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
