import basedir from '../basedir.js'
import { join } from 'path'
import { readdir } from 'fs/promises'
import { sendJSON } from './sendJSON.js'

export async function days (request, response) {
  sendJSON(response, (await readdir(join(basedir, 'data')))
    .filter(fileName => fileName.match(/\d+\.\d+\.\d+/))
    .sort()
  )
}
