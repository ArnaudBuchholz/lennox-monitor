import basedir from '../basedir.js'
import { join } from 'path'
import { stat, readFile } from 'fs/promises'
import { sendJSON } from './sendJSON.js'

export async function perday (request, response, param) {
  const [year, month, day] = /(\d\d\d\d)(\d\d)(\d\d)/.exec(param).slice(1)
  const csvFileName = join(basedir, 'data', `${year}.${month}.${day}`, 'records.csv')
  await stat(csvFileName)
  const lines = (await readFile(csvFileName))
    .toString()
    .split(/\r?\n/)
  const columns = lines[0]
    .split('\t')
    .slice(2) // day time
  columns.unshift('date')
  const records = [columns]
    .concat(lines
      .slice(1)
      .filter(line => line.trim())
      .map(line => line
        .split('\t')
        .reduce((record, value, index, values) => {
          if (index === 0) {
            const [, year, month, day, hours, mins, secs] = /(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/.exec(`${value} ${values[index + 1]}`)
            const date = new Date()
            date.setFullYear(year, month - 1, day)
            date.setHours(hours, mins, secs, 0)
            record.push(date.getTime())
          } else if (index > 1) {
            if (/^-?\d+(,\d+)?$/.exec(value)) {
              value = parseFloat(value.replace(',', '.'))
            }
            record.push(value)
          }
          return record
        }, [])
      )
    )
  sendJSON(response, records)
}
