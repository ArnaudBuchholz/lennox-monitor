import { punybind } from './punybind.js'

const data = punybind(document.body, {
  date: new Date(),
  dateColor: 'gray',
  temps: [19, 19, 19, 19, 19, 19.5, 19.5, 20, 20, 20.5, 20.5, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 20.5, 20]
})
