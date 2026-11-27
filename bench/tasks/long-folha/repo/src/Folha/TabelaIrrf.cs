namespace Folha;

public static class TabelaIrrf
{
    public const decimal DeducaoPorDependente = 189.59m;

    // Base de cálculo até o limite: alíquota e parcela a deduzir. A última faixa não tem limite.
    public static readonly IReadOnlyList<(decimal Ate, decimal Aliquota, decimal Deducao)> Faixas =
    [
        (2428.80m, 0m, 0m),
        (2826.65m, 0.075m, 182.16m),
        (3751.05m, 0.15m, 394.16m),
        (4664.68m, 0.225m, 675.49m),
        (decimal.MaxValue, 0.275m, 908.73m),
    ];
}
