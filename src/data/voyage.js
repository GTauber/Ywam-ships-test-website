// Geography for the homepage chart. Coordinates from OpenStreetMap (research notes, Oct 2026).

// An island-hopping line from Port YWAM to the Liberty's berth in Madang. Illustrative, not a sailed track.
export const route = [
  [-155.9955, 19.6403], // Port YWAM, Kona
  [-162.2, 17.4],
  [-169.51, 16.75], // past Johnston Atoll
  [178.5, 11.2],
  [171.3816, 7.091], // Majuro
  [167.7377, 8.7797], // Ebeye, Kwajalein
  [162.9811, 5.3143], // past Kosrae
  [158.2091, 6.9643], // Pohnpei
  [154.7624, 1.0673], // past Kapingamarangi
  [149.6, -1.6],
  [147.2789, -2.033], // Lorengau, Manus
  [145.973, -4.6376], // past Karkar
  [145.806, -5.214], // Madang
]

export const stops = [
  { name: 'Kona', lon: -155.9955, lat: 19.6403 },
  { name: 'Marshall Islands', lon: 171.3816, lat: 7.091 },
  { name: 'Madang', lon: 145.806, lat: -5.214 },
]

// Atolls are too small for coastline data, so each is drawn as a reef ring.
export const atolls = [
  { lon: 171.38, lat: 7.09, r: 0.22 }, // Majuro
  { lon: 167.4, lat: 9.0, r: 0.45 }, // Kwajalein
  { lon: 171.75, lat: 7.08, r: 0.14 }, // Arno
  { lon: 171.73, lat: 6.08, r: 0.13 }, // Mili
  { lon: 169.64, lat: 5.92, r: 0.16 }, // Jaluit
  { lon: 168.73, lat: 7.41, r: 0.2 }, // Ailinglaplap
  { lon: 168.16, lat: 7.99, r: 0.12 }, // Namu
  { lon: 167.38, lat: 8.31, r: 0.05 }, // Lib
  { lon: 166.23, lat: 8.94, r: 0.08 }, // Lae
  { lon: 165.68, lat: 9.08, r: 0.1 }, // Ujae
  { lon: 165.97, lat: 10.1, r: 0.1 }, // Wotho
  { lon: 171.2, lat: 8.7, r: 0.16 }, // Maloelap
  { lon: 170.0, lat: 9.45, r: 0.14 }, // Wotje
  { lon: 169.15, lat: 9.85, r: 0.11 }, // Likiep
  { lon: 169.84, lat: 11.23, r: 0.08 }, // Utirik
  { lon: 165.4, lat: 11.6, r: 0.2 }, // Bikini
  { lon: 154.76, lat: 1.07, r: 0.1 }, // Kapingamarangi
  { lon: 154.95, lat: 3.85, r: 0.08 }, // Nukuoro
  { lon: -169.51, lat: 16.75, r: 0.1 }, // Johnston
  { lon: 151.85, lat: 7.42, r: 0.45 }, // Chuuk lagoon
  { lon: 172.97, lat: 1.42, r: 0.18 }, // Tarawa
]

// Chart labels. `kind: 'sea'` is set in spaced italics like water on a nautical chart.
export const labels = [
  { text: 'Kailua-Kona', lon: -155.9955, lat: 19.6403 },
  { text: 'Hawaiʻi', lon: -155.3, lat: 21.4, kind: 'land' },
  { text: 'Majuro', lon: 171.3816, lat: 7.091 },
  { text: 'Ebeye', lon: 167.7377, lat: 8.7797 },
  { text: 'Pohnpei', lon: 158.2091, lat: 6.9643 },
  { text: 'Kapingamarangi', lon: 154.7624, lat: 1.0673 },
  { text: 'Madang', lon: 145.806, lat: -5.214 },
  { text: 'Karkar', lon: 145.973, lat: -4.6376, side: 'above' },
  { text: 'Manam', lon: 145.036, lat: -4.0775, side: 'left' },
  { text: 'Papua New Guinea', lon: 143.6, lat: -6.9, kind: 'land' },
  { text: 'North Pacific Ocean', lon: -176, lat: 21.5, kind: 'sea' },
  { text: 'Marshall Islands', lon: 169.5, lat: 11.8, kind: 'sea' },
  { text: 'Bismarck Sea', lon: 148.6, lat: -3.9, kind: 'sea' },
]
