import { describe, expect, it } from 'vitest';
import { applyPercentEntry, normalizeNumberText, normalizeTypedInput } from './typedInput';
import { Workbook } from './workbook';

describe('numeri digitati: italiano', () => {
  const it_ = (s: string) => normalizeNumberText(s, 'it');
  it.each([
    ['0,15', '0.15'],
    ['1.000', '1000'],
    ['1.234,56', '1234.56'],
    ['-0,5', '-0.5'],
    ['15,5%', '15.5%'],
    ['(1.250)', '-1250'],
    ['€ 5.000', '5000'],
    ['5,5 €', '5.5'],
    ['0.15', '0.15'], // la forma inglese non diventa 15
    ['1.5', '1.5'],
    ['1,234.50', '1234.50'],
    ['42', '42'],
  ])('%s -> %s', (input, out) => expect(it_(input)).toBe(out));

  it.each(['abc', 'B2', '', '1/2', '12/03/2025', '1.2.3,4,5'])('%s non e\' un numero', (s) =>
    expect(it_(s)).toBeNull(),
  );
});

describe('numeri digitati: inglese', () => {
  const en = (s: string) => normalizeNumberText(s, 'en');
  it.each([
    ['0.15', '0.15'],
    ['1,000', '1000'],
    ['1,234.56', '1234.56'],
    ['0,15', '0.15'],
    ['1.234,56', '1234.56'],
    ['15.5%', '15.5%'],
  ])('%s -> %s', (input, out) => expect(en(input)).toBe(out));
});

describe('formule digitate', () => {
  const wb = Workbook.create([{ name: 'S', data: [[1], [2]] }]);
  const ok = (f: string) => wb.isValidFormula(f);

  it('una formula valida non viene mai toccata', () => {
    expect(normalizeTypedInput('=IF(A1>0,1,0)', 'it', ok)).toBe('=IF(A1>0,1,0)');
    expect(normalizeTypedInput('=SUM(A1,2)', 'it', ok)).toBe('=SUM(A1,2)');
  });

  it('la virgola decimale dentro una formula viene riparata', () => {
    expect(normalizeTypedInput('=ABS(A1)<0,0001', 'it', ok)).toBe('=ABS(A1)<0.0001');
    expect(normalizeTypedInput('=(1+A1)^-0,5', 'it', ok)).toBe('=(1+A1)^-0.5');
    expect(normalizeTypedInput('=A1*1,5', 'en', ok)).toBe('=A1*1.5');
  });

  it('la sintassi di Excel in italiano (punto e virgola) viene convertita', () => {
    expect(normalizeTypedInput('=IF(A1>0,5;1;0)', 'it', ok)).toBe('=IF(A1>0.5,1,0)');
    expect(normalizeTypedInput('=SUMIF(A1:A2;">0,5";A1:A2)', 'it', ok)).toBe('=SUMIF(A1:A2,">0,5",A1:A2)');
  });

  it('il testo forzato con l\'apice resta testo', () => {
    expect(normalizeTypedInput("'0,15", 'it', ok)).toBe("'0,15");
  });
});

describe('applyPercentEntry (regole di Excel sulle percentuali)', () => {
  it('un numero col % in una cella Generale prende il formato percentuale', () => {
    expect(applyPercentEntry('12.4%', undefined)).toEqual({ raw: '12.4%', numFmt: '0.0%' });
    expect(applyPercentEntry('15%', 'General')).toEqual({ raw: '15%', numFmt: '0%' });
  });
  it('in una cella gia\' in percentuale, 15 vale 15% e 0.15 resta 0.15', () => {
    expect(applyPercentEntry('15', '0%')).toEqual({ raw: '15%' });
    expect(applyPercentEntry('0.15', '0.0%')).toEqual({ raw: '0.15' });
    expect(applyPercentEntry('-3', '0%')).toEqual({ raw: '-3%' });
  });
  it('formule, testo e celle non percentuali restano intatti', () => {
    expect(applyPercentEntry('=B2/B3', '0%')).toEqual({ raw: '=B2/B3' });
    expect(applyPercentEntry('15', '#,##0')).toEqual({ raw: '15' });
    expect(applyPercentEntry('ciao', '0%')).toEqual({ raw: 'ciao' });
    expect(applyPercentEntry(null, '0%')).toEqual({ raw: null });
  });
});
