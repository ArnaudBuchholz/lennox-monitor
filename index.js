'use strict'

import 'dotenv/config'
import { connect, read } from './lennox.js'
import { extract } from './extract.js'
import { replay } from './replay.js'

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
  }
}

main()
