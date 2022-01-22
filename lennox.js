'use strict'

import got from 'got'

const verbose = process.argv.includes('-verbose')

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36'
const DEFAULT_URL = 'https://www.myicomfort.com/Default.aspx'
const DASHBOARD_URL = 'https://www.myicomfort.com/Dashboard.aspx'
const READ_URL = `${DASHBOARD_URL}/NewGetManualInfo`

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

export async function connect () {
  const defaultPage = await got(DEFAULT_URL)
  ASPSessionID = /ASP.NET_SessionId=([^;]+);/.exec(defaultPage.headers['set-cookie'][0])[1]

  if (verbose) {
    console.log('ASP Session ID #1 :', ASPSessionID)
  }

  const getInput = (name, { body }) => new RegExp(`id="${name}" value="([^"]+)"`).exec(body)[1]

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

  const connect = await got.post(DEFAULT_URL, {
    followRedirect: false,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `iComfort=ic2; ASP.NET_SessionId=${ASPSessionID}`
    },
    form: {
      __LASTFOCUS: '',
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: getInput('__VIEWSTATE', defaultPage),
      __VIEWSTATEGENERATOR: getInput('__VIEWSTATEGENERATOR', defaultPage),
      __EVENTVALIDATION: getInput('__EVENTVALIDATION', defaultPage),
      ctl00$RightContent$hdnPwd: '',
      ctl00$RightContent$txtUserName: process.env.LENNOX_USERNAME,
      ctl00$RightContent$txtPwd: process.env.LENNOX_PASSWORD,
      ctl00$RightContent$chkRemember: 'on',
      ctl00$RightContent$btnLogin: 'Log+in'
    }
  })

  if (connect.statusCode !== 302) {
    console.log('Status Code :', connect.statusCode)
    throw new Error('Not connected (expected 302)')
  }

  ASPSessionID = /ASP.NET_SessionId=([^;]+);/.exec(connect.headers['set-cookie'][0])[1]
  RegisteredUserCookie = /RegisteredUserCookie=([^;]+);/.exec(connect.headers['set-cookie'][1])[1]
  if (verbose) {
    console.log('ASP Session ID #2 :', ASPSessionID)
    console.log('Registered User Cookie :', RegisteredUserCookie)
  }

  const dashboardPage = await got(DASHBOARD_URL, {
    headers: {
      ...commonHeaders(),
      ...headers
    }
  })

  if (dashboardPage.statusCode !== 200) {
    throw new Error('No dashboard')
  }

  HiddenGatewaySerialNumber = getInput('RightContent_hidden_Gateway1', dashboardPage)
  if (verbose) {
    console.log('Hidden Gateway Serial Number:', HiddenGatewaySerialNumber)
  }
}

export async function read () {
  return await got.post(READ_URL, {
    headers: {
      ...commonHeaders(),
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=UTF-8',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest'
    },
    json: {
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
  })
}
