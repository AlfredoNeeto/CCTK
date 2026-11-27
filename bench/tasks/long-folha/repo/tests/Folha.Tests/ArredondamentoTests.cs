using Folha;

public class ArredondamentoTests
{
    [Theory]
    [InlineData("2.345", "2.35")]
    [InlineData("2.344", "2.34")]
    [InlineData("-2.345", "-2.35")]
    public void Centavos(string valor, string esperado) =>
        Assert.Equal(decimal.Parse(esperado, System.Globalization.CultureInfo.InvariantCulture),
            Arredondamento.Centavos(decimal.Parse(valor, System.Globalization.CultureInfo.InvariantCulture)));
}
