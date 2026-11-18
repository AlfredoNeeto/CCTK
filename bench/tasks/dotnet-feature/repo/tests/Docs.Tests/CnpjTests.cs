using Docs;

public class CnpjTests
{
    [Fact]
    public void CnpjNumericoComMascaraEhValido() => Assert.True(Cnpj.IsValid("11.222.333/0001-81"));
}
