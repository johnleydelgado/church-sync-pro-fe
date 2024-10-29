export interface Item {
  price: string
  title: string
  features: string[]
}

const items: Item[] = [
  {
    price: '30',
    title: 'One Time Payment',
    features: [
      '5 team members',
      '200+ components',
      '40+ built-in pages',
      '1 year free updates',
      'Life time technical support',
    ],
  },
  {
    price: '49',
    title: 'Monthly',
    features: [
      '10 team members',
      '400+ components',
      '80+ built-in pages',
      '2 year free updates',
      'Life time technical support',
    ],
  },
  {
    price: '499',
    title: 'Yearly',
    features: [
      '15 team members',
      '600+ components',
      '120+ built-in pages',
      '3 year free updates',
      'Life time technical support',
    ],
  },
]

export default items
