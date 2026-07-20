/**
 * Decimal utilities using decimal.js for precise arithmetic.
 * SQLite stores decimals as strings — this ensures no floating-point errors.
 */
import Decimal from "decimal.js";

export class DecimalString {
  static add(a: string | number, b: string | number): string {
    return new Decimal(a).plus(new Decimal(b)).toString();
  }

  static sub(a: string | number, b: string | number): string {
    return new Decimal(a).minus(new Decimal(b)).toString();
  }

  static mul(a: string | number, b: string | number): string {
    return new Decimal(a).times(new Decimal(b)).toString();
  }

  static div(a: string | number, b: string | number): string {
    if (new Decimal(b).isZero()) throw new Error("Division by zero");
    return new Decimal(a).dividedBy(new Decimal(b)).toString();
  }

  static compare(a: string | number, b: string | number): number {
    return new Decimal(a).comparedTo(new Decimal(b));
  }

  static greaterThan(a: string | number, b: string | number): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  }

  static greaterThanOrEqual(a: string | number, b: string | number): boolean {
    return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
  }

  static lessThan(a: string | number, b: string | number): boolean {
    return new Decimal(a).lessThan(new Decimal(b));
  }

  static lessThanOrEqual(a: string | number, b: string | number): boolean {
    return new Decimal(a).lessThanOrEqualTo(new Decimal(b));
  }

  static toNumber(value: string | number): number {
    return new Decimal(value).toNumber();
  }

  static toFixed(value: string | number, precision: number = 2): string {
    return new Decimal(value).toFixed(precision);
  }
}
