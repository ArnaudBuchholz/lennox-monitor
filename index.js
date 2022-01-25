import 'dotenv/config'
import { connect, read } from './lennox.js'
import { extract } from './extract.js'
import { replay } from './replay.js'
import reserve from 'reserve'
import basedir from './basedir.js'
import { join } from 'path'
import { perday } from './api/perday.js'
import { days } from './api/days.js'

const { check, serve, log } = reserve
const DELAY = parseInt(process.env.LENNOX_DELAY || '60000', 10)

async function main () {
  if (process.argv.includes('-connect')) {
    await connect()
  } else if (process.argv.includes('-read')) {
    await connect()
    const { statusCode, headers, body } = await read()
    console.log(statusCode, headers, body)
  } else if (process.argv.includes('-replay')) {
    replay(process.argv.slice(2).filter(param => !param.startsWith('-'))[0])
  } else {
    await connect()
    async function job () {
      await read().then(extract)
      setTimeout(job, DELAY)
    }
    job()
    const configuration = await check({
      port: parseInt(process.env.LENNOX_PORT || '8080', 10),
      mappings: [{
        match: /^\/api\/(\d\d\d\d\d\d\d\d)/,
        custom: perday
      }, {
        match: /^\/api\/days/,
        custom: days
      }, {
        match: /^\/(.*)/,
        file: join(basedir, 'web', '$1')
      }]
    })
    log(serve(configuration))
  }
}

main()
