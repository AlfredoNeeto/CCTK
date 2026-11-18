using Docs;

public class HiddenCnpjTests
{
    [Theory]
    [InlineData("11.222.333/0001-81")]
    [InlineData("11222333000181")]
    [InlineData("12.ABC.345/01DE-35")]
    [InlineData("12ABC34501DE35")]
    public void Validos(string cnpj) => Assert.True(Cnpj.IsValid(cnpj));

    [Theory]
    [InlineData("11222333000182")]
    [InlineData("11222333000191")]
    [InlineData("00000000000000")]
    [InlineData("11111111111111")]
    [InlineData("1122233300018")]
    [InlineData("112223330001811")]
    [InlineData("12ABC34501DE36")]
    [InlineData("12ABC34501DEA5")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Invalidos(string? cnpj) => Assert.False(Cnpj.IsValid(cnpj));
}
