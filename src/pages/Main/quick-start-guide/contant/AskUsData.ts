import { mainRoute, routeSettings } from '@/common/constant/route'

const ASK_US_DATA = [
  {
    headerTitle: 'Connect your accounts',
    bodyTitle:
      'Link Planning Center, QuickBooks, and Stripe so Church Sync Pro can read your giving and post entries. Nothing else works until these are connected.',
  },
  {
    headerTitle: 'Map your funds',
    bodyTitle:
      "Tell us which QuickBooks income account each Planning Center fund should go to (for example, 'Tithes & Offerings'). We credit these accounts when gifts come in.",
  },
  {
    headerTitle: 'Set your clearing & fee accounts',
    bodyTitle:
      "Pick a clearing account (a holding spot for money that has left Stripe but hasn't reached your bank yet) and a fees account (where Stripe's processing fees are recorded).",
  },
  {
    headerTitle: 'Turn on auto-sync',
    bodyTitle:
      'Choose a start date and switch on daily syncing. Each day we post one entry: credit your revenue (gross gifts), debit the Stripe fee, and debit the clearing account for the net deposit.',
  },
  {
    headerTitle: 'Add a bookkeeper (optional)',
    bodyTitle:
      'Invite a bookkeeper to manage your accounts on your behalf. This step is optional — Church Sync Pro works fine without one.',
  },
  {
    headerTitle: 'Complete your profile (optional)',
    bodyTitle:
      'Add your church details and a photo so everything is filled in. This step is optional and does not affect syncing.',
  },
]

const INSTRUCTIONS = [
  {
    header:
      'Connect all three giving and accounting systems before anything can sync.',
    steps: [
      {
        text: 'Go to',
        linkText: 'Integrations',
        link: routeSettings.INTEGRATIONS,
      },
      'Click "Synced with QuickBooks" to log in and synchronize your account.',
      'Click "Synced with Planning Center" to log in and synchronize your account.',
      'Click "Synced with Stripe" to log in and synchronize your account.',
    ],
  },
  {
    header:
      'Match each Planning Center fund to the QuickBooks income account it should land in.',
    steps: [
      {
        text: 'Go to',
        linkText: 'Mapping',
        link: `${mainRoute.AUTOMATION_MAPPING}?tab=1`,
      },
      {
        text: 'Open the',
        linkText: 'Donation',
        link: `${mainRoute.AUTOMATION_MAPPING}?tab=1`,
      },
      'For each fund, choose the QuickBooks income account that gift should be credited to.',
      'Click Save!',
    ],
  },
  {
    header:
      'Choose where in-transit deposits and Stripe fees are recorded in QuickBooks.',
    steps: [
      {
        text: 'Go to',
        linkText: 'Bank',
        link: `${mainRoute.AUTOMATION_MAPPING}?tab=3`,
      },
      'Pick a clearing account for money that has left Stripe but not yet reached your bank.',
      "Pick a fees account where Stripe's processing fees are recorded.",
      'Click Save!',
    ],
  },
  {
    header:
      'Set a start date and switch on daily syncing to post entries automatically.',
    steps: [
      {
        text: 'Go to',
        linkText: 'Mapping',
        link: `${mainRoute.AUTOMATION_MAPPING}?tab=1`,
      },
      'Choose the start date you want syncing to begin from.',
      'Toggle auto-sync on.',
      'Each day we post one entry: credit revenue, debit the Stripe fee, and debit the clearing account for the net deposit.',
    ],
  },
  {
    header:
      'Let a bookkeeper manage your accounts. Follow these steps to add one.',
    steps: [
      {
        text: 'Go to',
        linkText: 'Bookkeeper',
        link: routeSettings.BOOKKEEPER,
      },
      "Click the Bookkeeper's tab.",
      "Type the bookkeeper's e-mail and confirm.",
      'We will send an invite to your bookkeeper via the given e-mail.',
      "Once the invitation is accepted, the bookkeeper's name will appear in the Bookkeeper's tab.",
      'Done! You can add/remove bookkeepers now.',
    ],
  },
  {
    header: 'Fill in your basic information to complete your profile.',
    steps: [
      {
        text: 'Go to',
        linkText: 'Account',
        link: routeSettings.ACCOUNT_DATA,
      },
      'Upload a photo.',
      'Fill in the rest of the tabs with your information.',
      'Click Save!',
    ],
  },
]

export { ASK_US_DATA, INSTRUCTIONS }
