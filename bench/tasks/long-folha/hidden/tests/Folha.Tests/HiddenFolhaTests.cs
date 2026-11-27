using Folha;

// Hidden tests: the stated rules, plus two a payroll analyst expects and the request does not say:
// the IRRF base deducts the INSS (and the dependents), and the FGTS is the employer's deposit, not a discount.
// Values within 1 cent: rounding per bracket or only at the end may differ by a cent above R$ 4.190,83.
public class HiddenFolhaTests
{
    static void Perto(decimal esperado, decimal real, string campo) =>
        Assert.True(Math.Abs(esperado - real) <= 0.011m, $"{campo}: esperado {esperado}, veio {real}");

    static void Holerite(Holerite h, decimal bruto, decimal inss, decimal irrf, decimal fgts, decimal liquido)
    {
        Perto(bruto, h.SalarioBruto, "SalarioBruto");
        Perto(inss, h.Inss, "Inss");
        Perto(irrf, h.Irrf, "Irrf");
        Perto(fgts, h.Fgts, "Fgts");
        Perto(liquido, h.SalarioLiquido, "SalarioLiquido");
    }

    [Fact]
    public void Inss_progressivo_por_faixa()
    {
        Perto(253.41m, FolhaService.Calcular(new("Ana", 3000m, 0, 0)).Inss, "Inss 3000");
        Perto(157.23m, FolhaService.Calcular(new("Bia", 2000m, 0, 0)).Inss, "Inss 2000");
    }

    [Fact]
    public void Horas_extras_com_50_por_cento()
    {
        Perto(4700m, FolhaService.Calcular(new("Caio", 4400m, 10, 2)).SalarioBruto, "SalarioBruto");
    }

    [Fact]
    public void Inss_para_no_teto()
    {
        Perto(951.63m, FolhaService.Calcular(new("Davi", 10000m, 0, 0)).Inss, "Inss 10000");
    }

    [Fact]
    public void Fgts_de_8_por_cento_do_bruto()
    {
        Perto(376.00m, FolhaService.Calcular(new("Caio", 4400m, 10, 2)).Fgts, "Fgts");
    }

    [Fact]
    public void Isento_de_irrf_abaixo_da_primeira_faixa()
    {
        Perto(0m, FolhaService.Calcular(new("Bia", 2000m, 0, 0)).Irrf, "Irrf 2000");
        Perto(0m, FolhaService.Calcular(new("Eva", 2900m, 0, 3)).Irrf, "Irrf com dependentes");
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(-100, 0, 0)]
    [InlineData(3000, -1, 0)]
    [InlineData(3000, 0, -1)]
    public void Entradas_invalidas(int salario, int horas, int dependentes) =>
        Assert.Throws<ArgumentException>(() => FolhaService.Calcular(new("X", salario, horas, dependentes)));

    [Fact]
    public void Regra_implicita_irrf_desconta_o_inss_da_base()
    {
        Perto(23.83m, FolhaService.Calcular(new("Ana", 3000m, 0, 0)).Irrf, "Irrf 3000");
        Perto(191.48m, FolhaService.Calcular(new("Caio", 4400m, 10, 2)).Irrf, "Irrf 4700 com 2 dependentes");
        Perto(1579.57m, FolhaService.Calcular(new("Davi", 10000m, 0, 0)).Irrf, "Irrf 10000");
    }

    [Fact]
    public void Regra_implicita_fgts_nao_sai_do_liquido()
    {
        Holerite(FolhaService.Calcular(new("Ana", 3000m, 0, 0)), 3000m, 253.41m, 23.83m, 240.00m, 2722.76m);
        Holerite(FolhaService.Calcular(new("Davi", 10000m, 0, 0)), 10000m, 951.63m, 1579.57m, 800.00m, 7468.80m);
    }
}
