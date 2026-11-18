namespace Docs;

public static class Cnpj
{
    public static bool IsValid(string? cnpj)
    {
        if (cnpj is null) return false;
        var s = new string(cnpj.Where(c => c is not ('.' or '/' or '-')).ToArray());
        if (s.Length != 14) return false;
        if (!s[..12].All(c => char.IsAsciiDigit(c) || char.IsAsciiLetterUpper(c))) return false;
        if (!s[12..].All(char.IsAsciiDigit)) return false;
        if (s.All(c => c == s[0])) return false;
        return Dv(s[..12]) == s[12] - '0' && Dv(s[..13]) == s[13] - '0';
    }

    static int Dv(string b)
    {
        int sum = 0, w = 2;
        for (int i = b.Length - 1; i >= 0; i--) { sum += (b[i] - '0') * w; w = w == 9 ? 2 : w + 1; }
        int r = sum % 11;
        return r < 2 ? 0 : 11 - r;
    }
}
