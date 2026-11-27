namespace Folha;

public static class TabelaInss
{
    // Faixas progressivas do INSS do empregado: limite superior da faixa e alíquota.
    // O último limite é o teto: acima dele não há contribuição.
    public static readonly IReadOnlyList<(decimal Ate, decimal Aliquota)> Faixas =
    [
        (1518.00m, 0.075m),
        (2793.88m, 0.09m),
        (4190.83m, 0.12m),
        (8157.41m, 0.14m),
    ];

    public static decimal Calcular(decimal bruto)
    {
        decimal inss = 0, anterior = 0;
        foreach (var (ate, aliquota) in Faixas)
        {
            if (bruto > anterior) inss += (Math.Min(bruto, ate) - anterior) * aliquota;
            anterior = ate;
        }
        return inss;
    }
}
