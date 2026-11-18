using Calendario;

public class DiasUteisTests
{
    [Fact]
    public void SegundaComumEhDiaUtil() => Assert.True(DiasUteis.EhDiaUtil(new DateOnly(2026, 11, 23)));
}
