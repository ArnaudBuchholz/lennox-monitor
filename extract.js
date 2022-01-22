import got from 'got'
import { join } from 'path'
import { mkdir, stat, writeFile } from 'fs/promises'
import __dirname from './dirname.js'

const verbose = process.argv.includes('-verbose')

export async function extract (response, live = true) {
  const date = new Date(response.headers.date)
  const z00 = value => value.toString().padStart(2, '0')
  const dayName = `${date.getFullYear()}.${z00(date.getMonth() + 1)}.${z00(date.getDate())}`
  const dayFolderPath = join(__dirname, 'data', dayName)

  const jsonFolderPath = join(dayFolderPath, z00(date.getHours()))
  await mkdir(jsonFolderPath, { recursive: true })
  const jsonFileName = `${z00(date.getHours())}.${z00(date.getMinutes())}.${z00(date.getSeconds())}.json`
  const jsonFilePath = join(jsonFolderPath, jsonFileName)
  if (verbose) {
    console.log(jsonFilePath)
  }
  const data = JSON.parse(JSON.parse(response.body).d)
  if (live) {
    await writeFile(jsonFilePath, JSON.stringify(data))
  }

  const OpenWeatherUrl = process.env.OPENWEATHER_URL
  let mainTemp = ''
  let mainTempFeelLike = ''
  if (OpenWeatherUrl && live) {
    try {
      const { data } = await got(OpenWeatherUrl).json()
      mainTemp = Math.floor(100 * data.main.temp - 27315) / 100
      mainTempFeelLike = Math.floor(100 * data.main.feels_like - 27315) / 100
    } catch (e) {
      mainTemp = '-'
      mainTempFeelLike = '-'
    }
  }

  const record = {
    day: `${date.getFullYear()}-${z00(date.getMonth() + 1)}-${z00(date.getDate())}`,
    time: `${z00(date.getHours())}:${z00(date.getMinutes())}:${z00(date.getSeconds())}`,
    temp: `${data.Indoor_Temp}.${data.fraction_Temp}`,
    humidity: data.Indoor_Humidity,
    heat_expected: data.Heat_Set_Point,
    heat_step: data.TStatInfo_List[0].Heat_Set_Point,
    cool_expected: data.Cool_Set_Point,
    system_status: data.System_Status,
    heating: data.System_Status === 'heating' ? 1 : 0,
    ext_temp: mainTemp,
    ext_feel: mainTempFeelLike
  }
  const header = Object.keys(record)

  if (verbose) {
    console.log(record)
  }

  const csvRecord = header
    .map(name => record[name].toString().replace(/\./g, ','))
    .join('\t')
  const csvFileName = join(dayFolderPath, 'records.csv')

  try {
    await stat(csvFileName)
  } catch (e) {
    await writeFile(csvFileName, header.join('\t') + '\n', { flag: 'a+' })
  }

  await writeFile(csvFileName, csvRecord + '\n', { flag: 'a+' })
}
