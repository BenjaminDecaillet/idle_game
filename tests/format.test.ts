import { describe, expect, it } from 'vitest';
import { formatDuration, formatMoney, formatNumber, formatRate } from '../src/game/format';

describe('formatNumber', () => {
  it('formats small integers with no suffix', () => {
    expect(formatNumber(5)).toBe('5');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats small fractional values with one decimal', () => {
    expect(formatNumber(5.4)).toBe('5.4');
    expect(formatNumber(9.99)).toBe('10.0');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1234)).toBe('1.23K');
    expect(formatNumber(1000)).toBe('1.00K');
    expect(formatNumber(99999)).toBe('100.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(1_234_567)).toBe('1.23M');
  });

  it('formats larger tiers (B, T)', () => {
    expect(formatNumber(1_234_567_890)).toBe('1.23B');
    expect(formatNumber(1_234_567_890_123)).toBe('1.23T');
  });

  it('handles negative values', () => {
    expect(formatNumber(-5)).toBe('-5');
    expect(formatNumber(-1234)).toBe('-1.23K');
    expect(formatNumber(-1_234_567)).toBe('-1.23M');
  });

  it('handles non-finite values', () => {
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(-Infinity)).toBe('∞');
    expect(formatNumber(NaN)).toBe('∞');
  });

  it('picks digit precision by magnitude within a tier', () => {
    // v >= 100 -> 0 digits, v >= 10 -> 1 digit, else 2 digits
    expect(formatNumber(123_000)).toBe('123K');
    expect(formatNumber(12_300)).toBe('12.3K');
    expect(formatNumber(1_230)).toBe('1.23K');
  });
});

describe('formatMoney / formatRate', () => {
  it('prefixes formatted number with a dollar sign', () => {
    expect(formatMoney(1234)).toBe('$1.23K');
    expect(formatMoney(5)).toBe('$5');
  });

  it('suffixes formatted number with /s', () => {
    expect(formatRate(1234)).toBe('1.23K/s');
    expect(formatRate(5)).toBe('5/s');
  });
});

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(59.9)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(60)).toBe('1m 0s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3672)).toBe('1h 1m');
    expect(formatDuration(3600)).toBe('1h 0m');
  });

  it('formats days and hours', () => {
    expect(formatDuration(90_000)).toBe('1d 1h'); // 25h = 1d 1h
    expect(formatDuration(86_400)).toBe('1d 0h');
  });
});
