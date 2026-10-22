import type {
  PayoutOutstanding,
  PayoutOutstandingItem,
} from '@/common/api/user'
import {
  coverageWarning,
  csvCell,
  csvFileName,
  firstStepWords,
  groupByDay,
  hasNoPayoutReports,
  inTransitSentence,
  itemCountWords,
  itemName,
  itemTotals,
  kindWords,
  lastDayOfMonth,
  listWords,
  outstandingCsv,
  paidOutWords,
  payoutRangeProblem,
  previousMonthRange,
  rangeWords,
  showAnywayWords,
} from './outstanding'

// Synthetic data only: never a real donor's name.
const item = (
  over: Partial<PayoutOutstandingItem> = {},
): PayoutOutstandingItem => ({
  day: '2026-09-30',
  kind: 'gift',
  ref: 'Donation #1',
  name: 'Test Donor',
  fundOrEvent: 'General Fund',
  gross: 100,
  fee: 2.5,
  net: 97.5,
  paidOut: null,
  ...over,
})

const report = (over: Partial<PayoutOutstanding> = {}): PayoutOutstanding => ({
  month: '2026-09',
  asOf: '2026-09-30',
  coverage: { complete: true, from: '2026-09-15', missing: [] },
  qbo: { account: { id: '1', name: 'Clearing' }, balance: 97.5 },
  inTransit: {
    net: 97.5,
    gifts: { count: 1, gross: 100, fee: 2.5, net: 97.5 },
    registrations: { count: 0, gross: 0, fee: 0, net: 0 },
  },
  difference: 0,
  differenceNotes: [],
  notInQuickBooksYet: [],
  items: [item()],
  ...over,
})

const money = (n: number) => `$${n.toFixed(2)}`

describe('payoutRangeProblem', () => {
  const today = '2026-10-22'

  it('accepts a range inside one month, ending today or earlier', () => {
    expect(payoutRangeProblem('2026-09-01', '2026-09-30', today)).toBeNull()
    expect(payoutRangeProblem('2026-10-01', '2026-10-22', today)).toBeNull()
    expect(payoutRangeProblem('2026-10-05', '2026-10-05', today)).toBeNull()
  })

  it('refuses a reversed range', () => {
    expect(payoutRangeProblem('2026-09-30', '2026-09-01', today)).toBe(
      'The “from” date is after the “to” date.',
    )
  })

  it('refuses a range ending in the future', () => {
    expect(payoutRangeProblem('2026-10-01', '2026-10-23', today)).toMatch(
      /in the future/,
    )
  })

  it("refuses a range across a month-end, naming that month's last day", () => {
    expect(payoutRangeProblem('2026-09-15', '2026-10-05', today)).toBe(
      "One file can't cover two months. Split it at the month-end: CSP can't tell which side of Sep 30 each row falls on.",
    )
    expect(payoutRangeProblem('2025-12-20', '2026-01-04', today)).toMatch(
      /side of Dec 31 each/,
    )
  })

  it('refuses missing and impossible dates', () => {
    expect(payoutRangeProblem('', '2026-09-30', today)).toMatch(/both/)
    expect(payoutRangeProblem('2026-02-01', '2026-02-30', today)).toMatch(
      /full date/,
    )
  })
})

describe('dates', () => {
  it('defaults the payout range to the previous calendar month', () => {
    expect(previousMonthRange(new Date(2026, 9, 22))).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
    expect(previousMonthRange(new Date(2026, 0, 3))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    })
    expect(previousMonthRange(new Date(2028, 2, 31))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it("finds a month's last day", () => {
    expect(lastDayOfMonth('2026-09')).toBe('2026-09-30')
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28')
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29')
  })

  it('words a range', () => {
    const sep = { from: '2026-09-15', to: '2026-09-30' }
    expect(rangeWords(sep)).toBe('Sep 15 – Sep 30')
    expect(rangeWords(sep, { compact: true })).toBe('Sep 15 – 30')
    expect(rangeWords({ from: '2026-10-03', to: '2026-10-03' })).toBe('Oct 3')
    expect(
      rangeWords({ from: '2026-09-28', to: '2026-10-03' }, { compact: true }),
    ).toBe('Sep 28 – Oct 3')
    expect(rangeWords(sep, { year: 2027 })).toBe('Sep 15, 2026 – Sep 30, 2026')
    expect(
      rangeWords({ from: '2026-12-28', to: '2027-01-03' }, { year: 2026 }),
    ).toBe('Dec 28, 2026 – Jan 3, 2027')
  })

  it('lists words', () => {
    expect(listWords([])).toBe('')
    expect(listWords(['A'])).toBe('A')
    expect(listWords(['A', 'B'])).toBe('A and B')
    expect(listWords(['A', 'B', 'C'])).toBe('A, B and C')
  })
})

describe('coverage', () => {
  const sepGap = {
    complete: false,
    from: '2026-09-15',
    missing: [{ from: '2026-09-15', to: '2026-09-30' }],
  }

  it('is null when the payout reports cover every day', () => {
    expect(coverageWarning(report().coverage, '2026-09-30')).toBeNull()
  })

  it('names the missing dates in words and says what they do to the total', () => {
    expect(coverageWarning(sepGap, '2026-09-30')).toBe(
      "Payout reports for Sep 15 – Sep 30 haven't been uploaded, so anything Stripe paid out on those dates still counts as in transit here.",
    )
    expect(
      coverageWarning(
        {
          complete: false,
          from: '2026-09-01',
          missing: [
            { from: '2026-09-01', to: '2026-09-07' },
            { from: '2026-09-21', to: '2026-09-21' },
            { from: '2026-10-01', to: '2026-10-22' },
          ],
        },
        '2026-10-22',
      ),
    ).toMatch(
      /^Payout reports for Sep 1 – Sep 7, Sep 21 and Oct 1 – Oct 22 haven't/,
    )
  })

  it('still warns when the server names no range', () => {
    expect(
      coverageWarning(
        { complete: false, from: '2026-09-15', missing: [] },
        '2026-09-30',
      ),
    ).toMatch(
      /^Not every payout date up to Sep 30 is in an uploaded payout report/,
    )
  })

  it('knows when no payout report covers any of the dates', () => {
    // A church's first visit: one gap from the start to the report's date.
    const none = report({
      asOf: '2026-10-22',
      coverage: {
        complete: false,
        from: '2026-09-15',
        missing: [{ from: '2026-09-15', to: '2026-10-22' }],
      },
    })
    expect(hasNoPayoutReports(none)).toBe(true)
    expect(firstStepWords(none)).toBe(
      "To see what's still in transit, upload your payout reports for Sep 15 – Oct 22.",
    )
    // Some uploaded: a gap at the end only, or two gaps.
    expect(
      hasNoPayoutReports(
        report({
          asOf: '2026-10-31',
          coverage: {
            complete: false,
            from: '2026-09-15',
            missing: [{ from: '2026-10-23', to: '2026-10-31' }],
          },
        }),
      ),
    ).toBe(false)
    expect(
      hasNoPayoutReports(
        report({
          coverage: {
            complete: false,
            from: '2026-09-01',
            missing: [
              { from: '2026-09-01', to: '2026-09-07' },
              { from: '2026-09-21', to: '2026-09-30' },
            ],
          },
        }),
      ),
    ).toBe(false)
    expect(hasNoPayoutReports(report())).toBe(false)
  })

  it('offers the posted list behind the first step', () => {
    expect(showAnywayWords([item(), item(), item()])).toBe(
      'Show the 3 posted gifts anyway',
    )
    expect(showAnywayWords([item()])).toBe('Show the 1 posted gift anyway')
    expect(
      showAnywayWords([item(), item({ kind: 'gift_refund', net: -5 })]),
    ).toBe('Show the 1 gift and 1 refund anyway')
  })

  it('makes the headline a ceiling while reports are missing', () => {
    const r = report({
      coverage: {
        complete: false,
        from: '2026-09-15',
        missing: [{ from: '2026-10-23', to: '2026-10-31' }],
      },
    })
    expect(inTransitSentence({ ...r, asOf: '2026-10-22' }, true, money)).toBe(
      'Up to $97.50 may still be in transit today.',
    )
    expect(inTransitSentence(r, false, money)).toBe(
      'Up to $97.50 may have been in transit on Sep 30.',
    )
  })
})

describe('report words', () => {
  it('words each kind, and shows an unknown one rather than dropping it', () => {
    expect(kindWords('gift_refund')).toBe('Gift refund')
    expect(kindWords('registration_refund')).toBe('Registration refund')
    expect(kindWords('day_unresolved')).toBe("Can't tell which gifts")
    expect(kindWords('something_new')).toBe('something new')
  })

  it('says when an item was paid out', () => {
    expect(paidOutWords({ from: '2026-10-01', to: '2026-10-31' }, 2026)).toBe(
      'Paid out in payouts of Oct 1 – 31',
    )
    expect(paidOutWords(null)).toBe('Not paid out yet')
  })

  it('words an older upload that has no payout start date', () => {
    expect(paidOutWords({ from: null, to: '2026-10-31' }, 2026)).toBe(
      'Paid out in payouts up to Oct 31',
    )
  })

  it("shows the server's names, and blank ones as no name", () => {
    expect(itemName(item({ name: 'Anonymous Donor' }))).toBe('Anonymous Donor')
    expect(itemName(item({ name: '   ' }))).toBe('')
    expect(itemName(item({ name: null }))).toBe('')
  })

  it('counts every kind of line, not only gifts and registrations', () => {
    expect(
      itemCountWords([
        item(),
        item(),
        item({ kind: 'registration', ref: 'Registration #456' }),
        item({ kind: 'gift_refund', net: -20 }),
        item({ kind: 'registration_refund', net: -10 }),
        item({ kind: 'day_unresolved', ref: null, name: null }),
      ]),
    ).toBe(
      "2 gifts, 1 registration, 2 refunds and 1 day CSP can't split into gifts",
    )
    expect(itemCountWords([item({ kind: 'gift_refund' })])).toBe('1 refund')
    expect(itemCountWords([])).toBe('')
  })

  it('writes the one sentence for a closed month', () => {
    const r = report({
      inTransit: {
        net: 6439.32,
        // The server counts charge lines only; the sentence counts the lines themselves.
        gifts: { count: 2, gross: 6450, fee: 10.68, net: 6400.82 },
        registrations: { count: 2, gross: 40, fee: 1.5, net: 38.5 },
      },
      items: [
        item(),
        item({ ref: 'Donation #2' }),
        item({ kind: 'registration', ref: 'Registration #456' }),
        item({ kind: 'registration', ref: 'Registration #457' }),
      ],
    })
    expect(inTransitSentence(r, false, money)).toBe(
      "$6439.32 was still in transit on Sep 30: 2 gifts and 2 registrations that Stripe paid out after Sep 30 (or hasn't paid out yet).",
    )
  })

  it('reads as today while the month is running', () => {
    expect(inTransitSentence(report({ asOf: '2026-10-22' }), true, money)).toBe(
      "$97.50 is still in transit today: 1 gift that Stripe hasn't paid out yet.",
    )
  })

  it('says plainly when nothing is in transit', () => {
    const empty = report({
      items: [],
      inTransit: {
        net: 0,
        gifts: { count: 0, gross: 0, fee: 0, net: 0 },
        registrations: { count: 0, gross: 0, fee: 0, net: 0 },
      },
    })
    expect(inTransitSentence(empty, false, money)).toMatch(
      /^Nothing was in transit on Sep 30/,
    )
    expect(inTransitSentence(empty, true, money)).toMatch(
      /^Nothing is in transit today/,
    )
  })

  it("gives an empty report's own reason, not 'all paid out'", () => {
    // Nothing posted yet: the server sends coverage.from null and says why there is nothing.
    const nothingPosted = report({
      message:
        "CSP hasn't posted anything to Clearing yet, so nothing is in transit.",
      coverage: { complete: true, from: null, missing: [] },
      difference: null,
      items: [],
      inTransit: {
        net: 0,
        gifts: { count: 0, gross: 0, fee: 0, net: 0 },
        registrations: { count: 0, gross: 0, fee: 0, net: 0 },
      },
    })
    expect(inTransitSentence(nothingPosted, true, money)).toBe(
      "CSP hasn't posted anything to Clearing yet, so nothing is in transit.",
    )
  })
})

describe('totals and grouping', () => {
  it('adds up in cents', () => {
    const totals = itemTotals([
      item({ gross: 0.1, fee: 0, net: 0.1 }),
      item({ gross: 0.2, fee: 0, net: 0.2 }),
      item({ gross: -10, fee: 0, net: -10, kind: 'gift_refund' }),
    ])
    expect(totals).toEqual({ count: 3, gross: -9.7, fee: 0, net: -9.7 })
  })

  it('groups by day, oldest first, keeping the order inside a day', () => {
    const groups = groupByDay([
      item({ day: '2026-09-30', ref: 'a' }),
      item({ day: '2026-09-15', ref: 'b' }),
      item({ day: '2026-09-30', ref: 'c', net: 2.5 }),
    ])
    expect(groups.map((g) => g.day)).toEqual(['2026-09-15', '2026-09-30'])
    expect(groups[1]?.items.map((i) => i.ref)).toEqual(['a', 'c'])
    expect(groups[1]?.net).toBe(100)
  })
})

describe('CSV', () => {
  it('escapes commas, quotes, line breaks and edge spaces', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('Smith, Jane')).toBe('"Smith, Jane"')
    expect(csvCell('The "Rock" Fund')).toBe('"The ""Rock"" Fund"')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
    expect(csvCell(' padded')).toBe('" padded"')
    expect(csvCell(null)).toBe('')
  })

  it('stops a spreadsheet running a name as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell('@me')).toBe("'@me")
  })

  it('writes a header line, the columns and one row per item', () => {
    const csv = outstandingCsv(
      'Grace, "Downtown"',
      report({
        items: [
          item({
            day: '2026-09-30',
            ref: 'Registration #456',
            kind: 'registration',
            name: 'Doe, John',
            fundOrEvent: 'Youth Retreat',
            gross: 40,
            fee: 1.5,
            net: 38.5,
            paidOut: { from: '2026-10-01', to: '2026-10-31' },
          }),
          item({
            day: '2026-09-15',
            ref: 'Donation #123',
            kind: 'gift_refund',
            gross: -25,
            fee: 0,
            net: -25,
          }),
        ],
      }),
    )
    expect(csv.split('\r\n')).toEqual([
      'Church,"Grace, ""Downtown""",Month,2026-09,As of,2026-09-30,Items,2,Gross,15.00,Fee,1.50,Net,13.50,Coverage,Complete',
      '',
      'Day,Kind,Ref,Name,Fund or event,Gross,Fee,Net,Paid out from,Paid out to',
      '2026-09-15,Gift refund,Donation #123,Test Donor,General Fund,-25.00,0.00,-25.00,,',
      '2026-09-30,Registration,Registration #456,"Doe, John",Youth Retreat,40.00,1.50,38.50,2026-10-01,2026-10-31',
      '',
    ])
  })

  it("writes the backend's awkward values cleanly", () => {
    const rows = outstandingCsv(
      'Test Church',
      report({
        items: [
          item({ ref: 'Donation #124', name: 'Anonymous Donor' }),
          item({ ref: 'Donation #125', name: '  ', fundOrEvent: ' Missions ' }),
          // An older upload: paid out by Oct 3, start unknown.
          item({
            ref: 'Donation #126',
            name: null,
            paidOut: { from: null, to: '2026-10-03' },
          }),
          // A day CSP can't split: no single record, so no ref and no name.
          item({
            kind: 'day_unresolved',
            ref: null,
            name: null,
            fundOrEvent: null,
            gross: 50,
            fee: 1,
            net: 49,
          }),
        ],
      }),
    )
      .split('\r\n')
      .slice(3, 7)
    expect(rows).toEqual([
      '2026-09-30,Gift,Donation #124,Anonymous Donor,General Fund,100.00,2.50,97.50,,',
      '2026-09-30,Gift,Donation #125,,Missions,100.00,2.50,97.50,,',
      '2026-09-30,Gift,Donation #126,,General Fund,100.00,2.50,97.50,,2026-10-03',
      "2026-09-30,Can't tell which gifts,,,,50.00,1.00,49.00,,",
    ])
  })

  it('carries the coverage warning into the header line', () => {
    const csv = outstandingCsv(
      'Test Church',
      report({
        coverage: {
          complete: false,
          from: '2026-09-15',
          missing: [{ from: '2026-09-15', to: '2026-09-30' }],
        },
      }),
    )
    expect(csv.split('\r\n')[0]).toMatch(
      /,Coverage,"Incomplete\. Payout reports for Sep 15 – Sep 30 haven't been uploaded, so anything Stripe paid out on those dates still counts as in transit here\."$/,
    )
  })

  it('names the file after the church and month', () => {
    expect(csvFileName('Active Church', '2026-09')).toBe(
      'in-transit-active-church-2026-09.csv',
    )
    expect(csvFileName("St. Mary's (Main)", '2026-10')).toBe(
      'in-transit-st-mary-s-main-2026-10.csv',
    )
    expect(csvFileName('', '2026-10')).toBe('in-transit-church-2026-10.csv')
  })
})
