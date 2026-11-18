using Calendario;

public class HiddenDiasUteisTests
{
    static DateOnly D(string s) => DateOnly.Parse(s, System.Globalization.CultureInfo.InvariantCulture);

    [Theory]
    [InlineData("2026-01-01")] [InlineData("2026-02-16")] [InlineData("2026-02-17")] [InlineData("2026-04-03")]
    [InlineData("2026-04-21")] [InlineData("2026-05-01")] [InlineData("2026-06-04")] [InlineData("2026-09-07")]
    [InlineData("2026-10-12")] [InlineData("2026-11-02")] [InlineData("2026-11-20")] [InlineData("2026-12-25")]
    [InlineData("2025-03-03")] [InlineData("2025-03-04")] [InlineData("2025-04-18")] [InlineData("2025-06-19")]
    [InlineData("2024-02-12")] [InlineData("2024-03-29")] [InlineData("2024-05-30")]
    [InlineData("2000-03-07")] [InlineData("2000-04-21")] [InlineData("2000-06-22")]
    [InlineData("2038-06-24")] [InlineData("2038-04-23")]
    [InlineData("2026-11-21")] [InlineData("2026-11-22")]
    public void NaoUteis(string d) => Assert.False(DiasUteis.EhDiaUtil(D(d)));

    [Theory]
    [InlineData("2026-02-18")] [InlineData("2026-02-13")] [InlineData("2026-04-02")] [InlineData("2026-04-06")]
    [InlineData("2026-12-31")] [InlineData("2026-11-23")] [InlineData("2038-06-23")] [InlineData("2025-04-22")]
    public void Uteis(string d) => Assert.True(DiasUteis.EhDiaUtil(D(d)));

    [Theory]
    [InlineData("2026-02-13", 1, "2026-02-18")]
    [InlineData("2026-04-02", 1, "2026-04-06")]
    [InlineData("2026-11-19", 2, "2026-11-24")]
    [InlineData("2026-12-24", 1, "2026-12-28")]
    [InlineData("2026-12-30", 2, "2027-01-04")]
    [InlineData("2026-11-23", 0, "2026-11-23")]
    [InlineData("2026-11-21", 0, "2026-11-23")]
    [InlineData("2026-11-20", 0, "2026-11-23")]
    [InlineData("2026-02-18", -1, "2026-02-13")]
    [InlineData("2026-01-05", -1, "2026-01-02")]
    public void Somar(string data, int dias, string esperado) => Assert.Equal(D(esperado), DiasUteis.Somar(D(data), dias));

    [Theory]
    [InlineData("2026-02-13", "2026-02-18", 1)]
    [InlineData("2026-02-18", "2026-02-13", -1)]
    [InlineData("2026-11-23", "2026-11-23", 0)]
    [InlineData("2026-01-01", "2026-01-31", 21)]
    [InlineData("2025-12-31", "2026-12-31", 249)]
    public void Contar(string inicio, string fim, int esperado) => Assert.Equal(esperado, DiasUteis.Contar(D(inicio), D(fim)));

    [Fact]
    public void SomarEContarSaoInversos()
    {
        // Starts are business days: for negative n from a non-business day the identity is off by one by design.
        foreach (var inicio in new[] { D("2026-02-13"), D("2024-12-20"), D("2000-04-20"), D("2038-06-21") })
            for (int n = -40; n <= 40; n++)
                if (n != 0) Assert.Equal(n, DiasUteis.Contar(inicio, DiasUteis.Somar(inicio, n)));
    }
}
