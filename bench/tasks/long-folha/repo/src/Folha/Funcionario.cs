namespace Folha;

// Dados do mês: salário base em reais, horas extras feitas no mês e número de dependentes para o IRRF.
public record Funcionario(string Nome, decimal SalarioBase, int HorasExtras, int Dependentes);
