namespace Calendario;

public static class DiasUteis
{
    static readonly (int M, int D)[] Fixos = [(1, 1), (4, 21), (5, 1), (9, 7), (10, 12), (11, 2), (11, 15), (11, 20), (12, 25)];

    static DateOnly Pascoa(int y) // Meeus/Jones/Butcher
    {
        int a = y % 19, b = y / 100, c = y % 100, d = b / 4, e = b % 4, f = (b + 8) / 25, g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30, i = c / 4, k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451, mes = (h + l - 7 * m + 114) / 31, dia = (h + l - 7 * m + 114) % 31 + 1;
        return new DateOnly(y, mes, dia);
    }

    static bool Feriado(DateOnly x)
    {
        if (Fixos.Contains((x.Month, x.Day))) return true;
        var p = Pascoa(x.Year);
        return x == p.AddDays(-48) || x == p.AddDays(-47) || x == p.AddDays(-2) || x == p.AddDays(60);
    }

    public static bool EhDiaUtil(DateOnly data) =>
        data.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday) && !Feriado(data);

    public static DateOnly Somar(DateOnly data, int dias)
    {
        if (dias == 0) { while (!EhDiaUtil(data)) data = data.AddDays(1); return data; }
        int passo = Math.Sign(dias);
        for (int n = Math.Abs(dias); n > 0;) { data = data.AddDays(passo); if (EhDiaUtil(data)) n--; }
        return data;
    }

    public static int Contar(DateOnly inicio, DateOnly fim)
    {
        if (fim < inicio) return -Contar(fim, inicio);
        int n = 0;
        for (var d = inicio.AddDays(1); d <= fim; d = d.AddDays(1)) if (EhDiaUtil(d)) n++;
        return n;
    }
}
