import { punybind } from './punybind.js'

(async function () {
  const data = await punybind(document.body, {
    date: new Date(),
    dateColor: 'gray',
    temps: [
      /* 00:00 */ { real: 19 },
      /* 01:00 */ { real: 19 },
      /* 02:00 */ { real: 19 },
      /* 03:00 */ { real: 19 },
      /* 04:00 */ { real: 19 },
      /* 05:00 */ { real: 19.5 },
      /* 06:00 */ { real: 19.5 },
      /* 07:00 */ { real: 20 },
      /* 08:00 */ { real: 20 },
      /* 09:00 */ { real: 20.5 },
      /* 10:00 */ { real: 20.5 },
      /* 11:00 */ { real: 21 },
      /* 12:00 */ { real: 21 },
      /* 13:00 */ { real: 21 },
      /* 14:00 */ { real: 21 },
      /* 15:00 */ { real: 21 },
      /* 16:00 */ { real: 21 },
      /* 17:00 */ { real: 21 },
      /* 18:00 */ { real: 21 },
      /* 19:00 */ { real: 21 },
      /* 20:00 */ { real: 21 },
      /* 21:00 */ { real: 21 },
      /* 22:00 */ { real: 21 },
      /* 23:00 */ { real: 20 }
    ]
  })
}())
