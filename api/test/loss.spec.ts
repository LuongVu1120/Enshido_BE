import { describe, expect, it } from 'vitest';
import { calcLoss } from '@enshido/types';

// T035 — Test bắt buộc theo Hiến pháp III (Weight/Loss Integrity) + SC-003.
describe('calcLoss — công thức hao hụt', () => {
  it('trước 12.50g, sau 12.20g → hao hụt 0.30g & 2.40% (Acceptance US7.1)', () => {
    const r = calcLoss({ previousWeight: 12.5, currentWeight: 12.2, initialWeight: 12.5 });
    expect(r.lossWeight).toBe(0.3);
    expect(r.lossPercent).toBe(2.4);
  });

  it('tính lũy kế theo TL ban đầu', () => {
    // ban đầu 12.50 → hiện tại 12.00 ⇒ lũy kế 0.50g = 4.00%
    const r = calcLoss({ previousWeight: 12.2, currentWeight: 12.0, initialWeight: 12.5 });
    expect(r.cumulativeLossWeight).toBe(0.5);
    expect(r.cumulativeLossPercent).toBe(4);
  });

  it('cảnh báo khi lũy kế vượt định mức 3% (US7.2)', () => {
    const r = calcLoss({
      previousWeight: 12.2,
      currentWeight: 12.0,
      initialWeight: 12.5,
      allowedLossPercent: 3,
    });
    expect(r.exceedsAllowed).toBe(true);
  });

  it('không cảnh báo khi trong định mức', () => {
    const r = calcLoss({
      previousWeight: 12.5,
      currentWeight: 12.2,
      initialWeight: 12.5,
      allowedLossPercent: 3,
    });
    expect(r.exceedsAllowed).toBe(false);
  });

  it('phát hiện hao hụt âm (TL sau > trước) → nghi nhập sai', () => {
    const r = calcLoss({ previousWeight: 12.0, currentWeight: 12.3, initialWeight: 12.5 });
    expect(r.isNegative).toBe(true);
    expect(r.lossWeight).toBeLessThan(0);
  });

  it('chia 0 an toàn khi previousWeight = 0', () => {
    const r = calcLoss({ previousWeight: 0, currentWeight: 0, initialWeight: 0 });
    expect(r.lossPercent).toBe(0);
    expect(r.cumulativeLossPercent).toBe(0);
  });
});
