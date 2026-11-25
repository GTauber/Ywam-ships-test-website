// Upcoming schools at Port YWAM, from ywamshipskona.org/train (October 2026).
export const schools = [
  { start: '2027-01-13', name: 'Ring of Fire DTS', type: 'dts', line: 'Discovering the ancient pathways of the Pacific', slug: 'ring-of-fire-dts' },
  { start: '2027-01-13', name: 'Island Adventure DTS', type: 'dts', line: 'To multiply missions in all nations', slug: 'island-adventure-dts' },
  { start: '2027-01-13', name: 'Discipleship Bible School', type: 'uofn', line: 'Read the whole Bible, the way most Christians never have', slug: 'discipleship-bible-school' },
  { start: '2027-01-13', name: 'Word By Heart', type: 'uofn', line: 'Taught in Korean and English', slug: 'word-by-heart' },
  { start: '2027-04-14', name: 'Encounter DTS', type: 'dts', line: 'Changed by His presence', slug: 'encounter-dts' },
  { start: '2027-04-14', name: 'Aloha DTS', type: 'dts', line: 'Fishers of men', slug: 'aloha-dts' },
  { start: '2027-04-14', name: 'Bible Core Course', type: 'uofn', line: "Understand God's word and apply it to your life", slug: 'bible-core-course' },
  { start: '2027-04-14', name: 'Transformational Development School', type: 'uofn', line: 'A lifestyle of growth and development', slug: 'transformational-development-school' },
  { start: '2027-07-07', name: 'Ablaze DTS', type: 'dts', line: 'Set your heart ablaze', slug: 'ablaze-dts' },
  { start: '2027-07-07', name: 'Discipleship Bible School', type: 'uofn', line: 'Read the whole Bible, the way most Christians never have', slug: 'discipleship-bible-school' },
  { start: '2027-09-23', name: 'Wayfinders DTS', type: 'dts', line: 'Live a life of extraordinary adventure with Jesus', slug: 'wayfinders-dts' },
  { start: '2027-09-23', name: 'Aloha DTS', type: 'dts', line: 'Fishers of men', slug: 'aloha-dts' },
  { start: '2027-09-23', name: 'Bible Core Course on Location', type: 'uofn', line: "Understand God's word and apply it to your life", slug: 'bible-core-course' },
]

export const typeLabel = { dts: 'DTS', uofn: 'UofN course' }

const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Pacific/Honolulu' })
export const formatDate = (iso) => fmt.format(new Date(`${iso}T12:00:00-10:00`))

export function daysUntil(iso, now = new Date()) {
  const start = new Date(`${iso}T08:00:00-10:00`)
  return Math.ceil((start - now) / 86400000)
}

export function countdown(iso) {
  const d = daysUntil(iso)
  if (d < 0) return 'In session'
  if (d === 0) return 'Starts today'
  if (d === 1) return 'Starts tomorrow'
  if (d < 60) return `Starts in ${d} days`
  const weeks = Math.round(d / 7)
  return `Starts in ${weeks} weeks`
}

export const upcoming = () => schools.filter((s) => daysUntil(s.start) >= 0)
