import __dirname from '../dirname.js'
import { join } from 'path'
import { stat, readFile } from 'fs/promises'

export async function perday (request, response, param) {
  const [year, month, day] = /(\d\d\d\d)(\d\d)(\d\d)/.exec(param).slice(1)
  const csvFileName = join(__dirname, 'data', `${year}.${month}.${day}`, 'records.csv')
  await stat(csvFileName)
  const lines = (await readFile(csvFileName))
    .toString()
    .split(/\r?\n/)
  const columns = lines[0].split('\t')
  const records = lines
    .slice(1)
    .map(line => line
      .split('\t')
      .reduce((record, value, index) => {
        if (/^-?\d+(,\d+)?$/.exec(value)) {
          value = parseFloat(value.replace(',', '.'))
        }
        record[columns[index]] = value
        return record
      }, {})
    )
  const json = JSON.stringify(records)
  response.writeHead(200, {
    'content-type': 'application/json',
    'content-length': json.length
  })
  response.end(json)
}
