/** Importe decimal en string con hasta 2 decimales, por ejemplo "1500.5" o "-20". */
const DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/;

function toCents(value: string): number {
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  const [integerPart, decimalPart = ""] = digits.split(".");
  const cents = Number(integerPart) * 100 + Number(decimalPart.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const integerPart = Math.trunc(absolute / 100);
  const decimalPart = absolute % 100;
  return `${sign}${integerPart}.${String(decimalPart).padStart(2, "0")}`;
}

/**
 * Suma importes decimales en string sin pasar por floats.
 * Trabaja en centavos enteros: los importes persistidos son NUMERIC(14,2).
 * Lanza RangeError si algún valor no es un importe válido.
 */
export function sumMoney(values: readonly string[]): string {
  let cents = 0;
  for (const value of values) {
    const trimmed = value.trim();
    if (!DECIMAL_PATTERN.test(trimmed)) {
      throw new RangeError(`Importe inválido: ${value}`);
    }
    cents += toCents(trimmed);
  }
  return fromCents(cents);
}
