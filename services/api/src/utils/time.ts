import { IST_TIME_ZONE } from '../constants.js'

function normalizeIstDateString(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

function istDateToUtc(dateString: string) {
  return new Date(`${dateString}T00:00:00+05:30`)
}

export function todayIstDate() {
  return normalizeIstDateString(new Date())
}

export function bookingWindowEndIstDate() {
  const today = istDateToUtc(todayIstDate())
  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() + 7)

  return normalizeIstDateString(end)
}

export function isWithinBookingWindow(mealDate: string) {
  const today = istDateToUtc(todayIstDate())
  const end = istDateToUtc(bookingWindowEndIstDate())
  const requested = istDateToUtc(mealDate)
  return requested >= today && requested <= end
}

export function isBeforeMealCutoff(mealDate: string, now = new Date()) {
  const mealStart = new Date(`${mealDate}T00:00:00+05:30`)
  const cutoff = new Date(mealStart.getTime() - 1)
  return now <= cutoff
}

export function generateDateRange(fromDate: string, toDate: string) {
  const from = istDateToUtc(fromDate)
  const to = istDateToUtc(toDate)
  const dates: string[] = []

  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(normalizeIstDateString(d))
  }

  return dates
}
