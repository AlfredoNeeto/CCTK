import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  return (
    <div className="prototipo">
      <div className="entrada">
        <form className="caixa cartao-entrada" id="form-login" onSubmit={(e) => { e.preventDefault(); navigate('/contas'); }}>
          <h1>Financeiro Claro</h1>
          <p>Entre com seu CPF e senha.</p>
          <div className="campo"><label htmlFor="cpf">CPF</label><input id="cpf" placeholder="000.000.000-00" /></div>
          <div className="campo"><label htmlFor="senha">Senha</label><input id="senha" type="password" /></div>
          <button className="btn primario" id="entrar" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
