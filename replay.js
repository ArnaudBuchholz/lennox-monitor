import { readdir, rename, readFile } from 'fs/promises'
import { extract } from './extract.js'

export async function replay (date) {
  const baseFolder = `./data/${date}`
  const baseDate = new Date(date.substring(0, 4), parseInt(date.substring(5, 7), 10) - 1, date.substring(8, 10), 0, 0, 0, 0)
  console.log(`Replaying ${date}`)
  try {
    await rename(`${baseFolder}/records.csv`, `${baseFolder}/records.${new Date().toISOString().replace(/:/g, '_')}.bak`)
  } catch (e) {
    console.error(e.toString())
  }
  const hours = (await readdir(baseFolder)).filter(name => !name.includes('.')).sort()
  for await (const hour of hours) {
    const logs = (await readdir(`${baseFolder}/${hour}`)).sort()
    for await (const log of logs) {
      const savedResponse = (await readFile(`${baseFolder}/${hour}/${log}`)).toString()
      baseDate.setHours(log.substring(0, 2))
      baseDate.setMinutes(log.substring(3, 5))
      baseDate.setSeconds(log.substring(6, 8))
      const responseText = `{"d":"${savedResponse.replace(/"/g, '\\"')}"}`
      await extract({
        headers: {
          date: baseDate
        },
        responseText
      }, false)
    }
  }
  console.log('done.')
}
