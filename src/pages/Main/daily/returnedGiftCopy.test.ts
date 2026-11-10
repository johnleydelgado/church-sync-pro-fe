import { returnedGiftWords } from './returnedGiftCopy'

// Active Church, October 2026: a $600 ACH gift (fee $0.30) returned on 10/5; the return cost $1.00.
const october = {
  state: 'returned_gift',
  gift: 600,
  fee: 0.3,
  returnedOn: '2026-10-05',
  cost: 1,
}

describe('returnedGiftWords', () => {
  test('never in QuickBooks: book only what the return cost', () => {
    expect(returnedGiftWords(october)).toBe(
      "The donor's bank returned this gift on 10/5/2026, so it was never in QuickBooks. To settle it, book the $ 1.00 it cost: debit your Stripe fees account, credit Clearing, dated 10/5/2026. Then mark it handled.",
    )
  })

  test('the cost not known yet says when it will be', () => {
    expect(
      returnedGiftWords({ ...october, returnedOn: null, cost: null }),
    ).toContain('will show once the payout report with the return is uploaded')
  })

  test('a return that cost nothing has nothing to book', () => {
    expect(returnedGiftWords({ ...october, cost: 0 })).toContain(
      'nothing to book. Mark it handled.',
    )
  })

  test('a return that gave money back books it the other way', () => {
    expect(returnedGiftWords({ ...october, cost: -0.25 })).toContain(
      'book the $ 0.25 it gave back: debit Clearing, credit your Stripe fees account',
    )
  })

  test('posted before it came back: one entry, the original fee counted once', () => {
    // Reverse $600 income, $0.30 fee and $599.70 Clearing, and book $1.00: debit income 600.00,
    // debit fees 0.70, credit Clearing 600.70.
    expect(
      returnedGiftWords({ ...october, state: 'returned_after_posting' }),
    ).toBe(
      "The donor's bank returned this gift on 10/5/2026 after CSP had posted it, so QuickBooks still has it. Add one entry dated 10/5/2026: debit the gift's income account $ 600.00, debit your Stripe fees account $ 0.70, credit Clearing $ 600.70. Then mark it handled.",
    )
  })

  test('...where the fee refunded outweighs the cost, the fee account is credited', () => {
    expect(
      returnedGiftWords({
        ...october,
        state: 'returned_after_posting',
        cost: 0.1,
      }),
    ).toContain(
      'credit your Stripe fees account $ 0.20, credit Clearing $ 599.80',
    )
  })

  test('...and before the return is uploaded, it says the entry will follow', () => {
    expect(
      returnedGiftWords({
        ...october,
        state: 'returned_after_posting',
        returnedOn: null,
        cost: null,
      }),
    ).toContain('this shows the exact entry to add')
  })

  test("its day isn't fully posted: CSP can't tell yet", () => {
    expect(
      returnedGiftWords({ ...october, state: 'returned_day_unsettled' }),
    ).toContain(
      'Bring the day up to date on Daily Giving, then press Check again.',
    )
  })
})
