namespace Folha;

public static class FolhaService
{
    public static Holerite Calcular(Funcionario f)
    {
        if (f.SalarioBase <= 0) throw new ArgumentException("O salário base deve ser positivo.", nameof(f));
        if (f.HorasExtras < 0 || f.Dependentes < 0) throw new ArgumentException("Horas extras e dependentes não podem ser negativos.", nameof(f));

        var bruto = Arredondamento.Centavos(f.SalarioBase + f.HorasExtras * (f.SalarioBase / 220m) * 1.5m);

        decimal inss = 0, anterior = 0;
        foreach (var (ate, aliquota) in TabelaInss.Faixas)
        {
            if (bruto > anterior) inss += (Math.Min(bruto, ate) - anterior) * aliquota;
            anterior = ate;
        }
        inss = Arredondamento.Centavos(inss);

        // A base do IRRF desconta o INSS e os dependentes.
        var baseIrrf = bruto - inss - f.Dependentes * TabelaIrrf.DeducaoPorDependente;
        var faixa = TabelaIrrf.Faixas.First(x => baseIrrf <= x.Ate);
        var irrf = Arredondamento.Centavos(Math.Max(0, baseIrrf * faixa.Aliquota - faixa.Deducao));

        // O FGTS é depósito do empregador: não sai do salário líquido.
        var fgts = Arredondamento.Centavos(bruto * 0.08m);
        return new Holerite(bruto, inss, irrf, fgts, bruto - inss - irrf);
    }
}
