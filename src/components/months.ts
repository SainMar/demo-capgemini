export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function formatWeek(weekKey: string): string {
  const [, month, day] = weekKey.split('-').map(Number)
  return `${MONTHS[month - 1]} ${day}`
}
