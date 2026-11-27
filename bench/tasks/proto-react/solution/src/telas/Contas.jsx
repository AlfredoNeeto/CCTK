import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { contas } from '../dados.js';

const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
const data = (d) => d.split('-').reverse().join('/');
const SELO = { 'vence-hoje': ['alerta', 'Vence hoje'], aberta: ['info', 'Aberta'], atrasada: ['erro', 'Atrasada'] };

export default function Contas() {
  const [nova, setNova] = useState(false);
  const total = contas.reduce((s, c) => s + c.valor, 0);
  return (
    <div className="prototipo">
      <div className="app">
        <aside className="menu">
          <div className="marca"><span className="logo">FC</span>Financeiro Claro</div>
          <nav><NavLink to="/contas" className={({ isActive }) => (isActive ? 'ativo' : '')}>Contas a pagar</NavLink></nav>
          <div className="rodape">Ana Souza · <Link id="sair" to="/login">Sair</Link></div>
        </aside>
        <main>
          <header className="topo">
            <div><div className="trilha">Financeiro › Contas</div><h1>Contas a pagar</h1></div>
            <div className="acoes"><button className="btn primario" id="nova-conta" type="button" onClick={() => setNova(true)}>Nova conta</button></div>
          </header>
          <div className="conteudo">
            <div className="filtros">
              <div className="campo"><label htmlFor="periodo">Período</label>
                <select id="periodo"><option>Março de 2026</option><option>Abril de 2026</option></select></div>
              <button className="btn" id="filtrar" type="button">Filtrar</button>
            </div>
            <div className="caixa"><div className="rolagem">
              <table className="tabela" id="contas">
                <thead><tr><th>Fornecedor</th><th>Vencimento</th><th className="num">Valor</th><th>Status</th></tr></thead>
                <tbody>
                  {contas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fornecedor}</td><td>{data(c.vencimento)}</td><td className="num">{reais(c.valor)}</td>
                      <td><span className={`selo ${SELO[c.status][0]}`}>{SELO[c.status][1]}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>{contas.length} contas</td><td></td><td className="num">{reais(total)}</td><td></td></tr></tfoot>
              </table>
            </div></div>
          </div>
        </main>
      </div>
      {nova && (
        <div className="modal aberto">
          <div className="janela">
            <header><h2>Nova conta</h2></header>
            <div className="corpo"><div className="form">
              <div className="campo inteiro"><label htmlFor="fornecedor">Fornecedor <span className="obrig">*</span></label><input id="fornecedor" /></div>
              <div className="campo"><label htmlFor="valor">Valor</label><input id="valor" /></div>
            </div></div>
            <footer>
              <button className="btn" id="cancelar" type="button" onClick={() => setNova(false)}>Cancelar</button>
              <button className="btn primario" id="salvar" type="button" onClick={() => setNova(false)}>Salvar</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
