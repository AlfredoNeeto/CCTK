namespace Folha;

public static class Arredondamento
{
    // Centavos, com meio centavo para longe do zero (como a folha da empresa sempre fez).
    public static decimal Centavos(decimal valor) => Math.Round(valor, 2, MidpointRounding.AwayFromZero);
}
