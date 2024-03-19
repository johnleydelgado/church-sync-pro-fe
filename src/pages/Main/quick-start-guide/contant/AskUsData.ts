const ASK_US_DATA = [
  {
    headerTitle: 'Account Integrations',
    bodyTitle:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cup',
  },
  {
    headerTitle: 'Add a Bookkeeper',
    bodyTitle:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cup',
  },
  {
    headerTitle: 'Complete your Profile',
    bodyTitle:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cup',
  },
  {
    headerTitle: 'Map your Accounts',
    bodyTitle:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cup',
  },
]

const INSTRUCTIONS = [
  {
    header:
      'To complete this set-up, fill the basic information in the Account Data.',
    steps: [
      { text: 'Go to', linkText: 'Settings', link: '/settings/integrations' },
      'Click "Synced with QuickBooks" to log in and synchronize your account.',
      'Click "Synced with Planning Center" to log in and synchronize your account.',
      'Click "Synced with Stripe" to log in and synchronize your account.',
    ],
  },
  {
    header:
      'Let a Bookkeeper manage your accounts. Follow these steps to add one.',
    steps: [
      { text: 'Go to', linkText: 'Mapping', link: '/settings/bookkeeper' },
      "Click Bookkeeper's Tab",
      "Type Bookkeeper's e-mail and confirm.",
      'We will send an invite to your Bookkeeper via given e-mail.',
      "Once invitation is accepted, Bookkeeper's name will appear in the Bookkeeper's tab.",
      'Done! You can add/remove Bookkeepers now.',
    ],
    headerLink: '/settings',
  },
  {
    header:
      'To complete this set-up, fill the basic information in the Account Data.',
    steps: [
      'Click Settings',
      {
        text: 'Click ',
        linkText: 'Account',
        link: '/settings/account-data',
      },
      'Upload a photo.',
      'Fill in the rest of the tabs with your information.',
      'Click Save!',
    ],
  },
  {
    header:
      "To begin syncing, let's map your Accounts in the Church Sync Pro app!",
    steps: [
      {
        text: 'Go to ',
        linkText: 'Automation',
        link: '/automation/mapping?tab=1',
      },
      {
        text: 'Click ',
        linkText: ' Donation',
        link: '/automation/mapping?tab=1',
      },
      {
        text: 'Click ',
        linkText: ' Registration',
        link: '/automation/mapping?tab=2',
      },
      {
        text: 'Click ',
        linkText: ' Bank',
        link: '/automation/mapping?tab=3',
      },
      'Map the data as seen on your Quickbooks, Planning Center Online, or Stripe accounts.',
      'Click Save!',
    ],
  },
]

export { ASK_US_DATA, INSTRUCTIONS }
