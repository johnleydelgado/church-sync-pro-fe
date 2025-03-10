import { format, parse, parseISO } from 'date-fns'
import { FormatMoney } from 'format-money-js'

const formatUsd = (number: string) => {
  const fm = new FormatMoney({
    decimals: 2,
  })
  return fm.from(Number(number) / 100, { symbol: '$ ' })?.toString()
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  // Convert the date string to a JavaScript Date object
  const date = parseISO(dateString)

  // Format the date using a format string
  return format(date, 'M/d/yyyy') // Example: '4/10/2023'
}

const capitalAtFirstLetter = (str: string | undefined) => {
  const name = str || ''
  const fString = name.charAt(0).toUpperCase() + name.slice(1)
  return fString
}

const getFirstCharCapital = (s: string | undefined) => {
  return s ? s.charAt(0).toLocaleUpperCase() : null
}
export { formatUsd, formatDate, capitalAtFirstLetter, getFirstCharCapital }
