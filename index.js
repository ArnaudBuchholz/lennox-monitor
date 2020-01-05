'use strict'

require('dotenv').config()
const gpf = require('gpf-js')
const path = require('path')
const fs = require('fs')
const util = require('util')

const statAsync = util.promisify(fs.stat)
const writeFileAsync = util.promisify(fs.writeFile)
const mkdirAsync = util.promisify(fs.mkdir)
const readdirAsync = util.promisify(fs.readdir)
const renameAsync = util.promisify(fs.rename)
const readFileAsync = util.promisify(fs.readFile)

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36'
const DEFAULT_URL = 'https://www.myicomfort.com/Default.aspx'
const DASHBOARD_URL = 'https://www.myicomfort.com/Dashboard.aspx'
const READ_URL = `${DASHBOARD_URL}/NewGetManualInfo`

let DELAY
if (process.env.LENNOX_DELAY) {
  DELAY = parseInt(process.env.LENNOX_DELAY, 10)
} else {
  DELAY = 60000
}

const verbose = process.argv.includes('-verbose')

let ASPSessionID
let RegisteredUserCookie
let HiddenGatewaySerialNumber

function commonHeaders () {
  return {
    Cookie: `iComfort=ic2; ASP.NET_SessionId=${ASPSessionID}; RegisteredUserCookie=${RegisteredUserCookie}`,
    Host: 'www.myicomfort.com',
    Origin: 'https://www.myicomfort.com',
    Referer: 'https://www.myicomfort.com/Dashboard.aspx',
    'User-Agent': USER_AGENT
  }
}

async function read () {
  const payload = {
    hidden_gateway_SN: HiddenGatewaySerialNumber,
    pref_temp_units: '1',
    userid: process.env.LENNOX_USERNAME,
    Central_Zoned_Away: '2',
    Cancel_Away: '-1',
    current_prg: '2',
    current_mode: '1',
    CurrentBrowser: 'chrome',
    zoneNumber: '0',
    Current_Thermostat: '0',
    alertViewTypes: '0',
    alertTypes: '1',
    reminderTypes: '0',
    authorizationToken: /username=(.*)/.exec(RegisteredUserCookie)[1]
  }
  return gpf.http.request({
    method: gpf.http.methods.post,
    url: READ_URL,
    headers: {
      ...commonHeaders(),
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=UTF-8',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest'
    },
    data: JSON.stringify(payload)
  })
}

async function connect () {
  const defaultPage = await gpf.http.get(DEFAULT_URL)
  ASPSessionID = /ASP.NET_SessionId=([^;]+);/.exec(defaultPage.headers['set-cookie'][0])[1]

  const getInput = (name, responseText) => new RegExp(`id="${name}" value="([^"]+)"`).exec(responseText)[1]

  const viewState = getInput('__VIEWSTATE', defaultPage.responseText)
  const viewStateGenerator = getInput('__VIEWSTATEGENERATOR', defaultPage.responseText)
  const eventValidation = getInput('__EVENTVALIDATION', defaultPage.responseText)

  const headers = {
    Host: 'www.myicomfort.com',
    Origin: 'https://www.myicomfort.com',
    'Upgrade-Insecure-Requests': 1,
    'User-Agent': USER_AGENT,
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    Referer: 'https://www.myicomfort.com/Default.aspx'
  }

  const payload = '__LASTFOCUS=&__EVENTTARGET=&__EVENTARGUMENT='
  + `&__VIEWSTATE=${encodeURIComponent(viewState)}`
  + `&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}`
  + `&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}`
  + '&ctl00%24RightContent%24hdnPwd='
  + `&ctl00%24RightContent%24txtUserName=${process.env.LENNOX_USERNAME}`
  + `&ctl00%24RightContent%24txtPwd=${process.env.LENNOX_PASSWORD}`
  + '&ctl00%24RightContent%24chkRemember=on'
  + '&ctl00%24RightContent%24btnLogin=Log+in'
  const connect = await gpf.http.request({
    method: gpf.http.methods.post,
    url: DEFAULT_URL,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `iComfort=ic2; ASP.NET_SessionId=${ASPSessionID}`
    },
    data: payload
  })

  if (connect.status !== 302) {
    throw new Error('Not connected')
  }

  ASPSessionID = /ASP.NET_SessionId=([^;]+);/.exec(connect.headers['set-cookie'][0])[1]
  RegisteredUserCookie = /RegisteredUserCookie=([^;]+);/.exec(connect.headers['set-cookie'][1])[1]
  if (verbose) {
    console.log(`ASPSessionID=${ASPSessionID}`)
    console.log(`RegisteredUserCookie=${RegisteredUserCookie}`)
  }

  const dashboardPage = await gpf.http.request({
    method: gpf.http.methods.get,
    url: DASHBOARD_URL,
    headers: {
      ...commonHeaders(),
      ...headers
    }
  })

  if (dashboardPage.status !== 200) {
    throw new Error('No dashboard')
  }

  HiddenGatewaySerialNumber = getInput('RightContent_hidden_Gateway1', dashboardPage.responseText)
  if (verbose) {
    console.log(`HiddenGatewaySerialNumber=${HiddenGatewaySerialNumber}`)
  }
}

async function extract (response, live = true) {
  const date = new Date(response.headers.date)
  const z00 = value => value.toString().padStart(2, '0')
  const dayName = `${date.getFullYear()}.${z00(date.getMonth() + 1)}.${z00(date.getDate())}`
  const dayFolderPath = path.join(__dirname, 'data', dayName)

  const jsonFolderPath = path.join(dayFolderPath, z00(date.getHours()))
  await mkdirAsync(jsonFolderPath, { recursive: true })
  const jsonFileName = `${z00(date.getHours())}.${z00(date.getMinutes())}.${z00(date.getSeconds())}.json`
  const jsonFilePath = path.join(jsonFolderPath, jsonFileName)
  if (verbose) {
    console.log(jsonFilePath)
  }
  const data = JSON.parse(JSON.parse(response.responseText).d)
  if (live) {
    await writeFileAsync(jsonFilePath, JSON.stringify(data))
  }

  const OpenWeatherUrl = process.env.OPENWEATHER_URL
  let mainTemp = ''
  let mainTempFeelLike = ''
  if (OpenWeatherUrl && live) {
    try {
      const weatherData = JSON.parse((await gpf.http.get(OpenWeatherUrl)).responseText)
      mainTemp = Math.floor(100 * weatherData.main.temp - 27315) / 100
      mainTempFeelLike = Math.floor(100 * weatherData.main.feels_like - 27315) / 100
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
  const csvFileName = path.join(dayFolderPath, 'records.csv')

  try {
    await statAsync(csvFileName)
  } catch (e) {
    await writeFileAsync(csvFileName, header.join('\t') + '\n', { flag: 'a+' })
  }

  await writeFileAsync(csvFileName, csvRecord + '\n', { flag: 'a+' })
  setTimeout(job, DELAY)
}

function job () {
  read().then(extract)
}

async function replay (date) {
  const baseFolder = `./data/${date}`
  const baseDate = new Date(date.substring(0, 4), parseInt(date.substring(5, 7), 10) - 1, date.substring(8, 10), 0, 0, 0, 0)
  console.log(`Replaying ${date}`)
  try {
    await renameAsync(`${baseFolder}/records.csv`, `${baseFolder}/records.${new Date().toISOString().replace(/:/g, '_')}.bak`)
  } catch (e) {
    console.error(e.toString())
  }
  const hours = (await readdirAsync(baseFolder)).filter(name => !name.includes('.')).sort()
  for (const hour of hours) {
    const logs = (await readdirAsync(`${baseFolder}/${hour}`)).sort()
    for (const log of logs) {
      const savedResponse = (await readFileAsync(`${baseFolder}/${hour}/${log}`)).toString()
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
  console.log("done.")
}

if (process.argv.includes('-replay')) {
  replay(process.argv.slice(2).filter(param => !param.startsWith('-'))[0])
} else {
  connect().then(job)
}
