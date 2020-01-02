'use strict'

require('dotenv').config()
const gpf = require('gpf-js')

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36'
const DEFAULT_URL = 'https://www.myicomfort.com/Default.aspx'
const READ_URL = 'https://www.myicomfort.com/Dashboard.aspx/NewGetManualInfo'

let ASPSessionID
let RegisteredUserCookie

async function read () {
  const payload = {
    hidden_gateway_SN: "WS18J01200",
    pref_temp_units: "1",
    userid: process.env.LENNOX_USERNAME,
    Central_Zoned_Away: "2",
    Cancel_Away: "-1",
    current_prg: "2",
    current_mode: "1",
    CurrentBrowser: "chrome",
    zoneNumber: "0",
    Current_Thermostat: "0",
    alertViewTypes: "0",
    alertTypes: "1",
    reminderTypes: "0",
    authorizationToken: /username=(.*)/.exec(RegisteredUserCookie)[1]
  }
  const response = await gpf.http.request({
    method: gpf.http.methods.post,
    url: READ_URL,
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=UTF-8',
      Cookie: `iComfort=ic2; ASP.NET_SessionId=${ASPSessionID}; RegisteredUserCookie=${RegisteredUserCookie}`,
      Host: 'www.myicomfort.com',
      Origin: 'https://www.myicomfort.com',
      Referer: 'https://www.myicomfort.com/Dashboard.aspx',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest'
    },
    data: JSON.stringify(payload)
  })
  console.log(response)
}

async function connect () {
  const defaultPage = await gpf.http.get(DEFAULT_URL)
  ASPSessionID = /ASP.NET_SessionId=([^;]+);/.exec(defaultPage.headers['set-cookie'][0])[1]
  const viewState = /id="__VIEWSTATE" value="([^"]+)"/.exec(defaultPage.responseText)[1]
  const viewStateGenerator = /id="__VIEWSTATEGENERATOR" value="([^"]+)"/.exec(defaultPage.responseText)[1]
  const eventValidation = /id="__EVENTVALIDATION" value="([^"]+)"/.exec(defaultPage.responseText)[1]

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
      Host: 'www.myicomfort.com',
      Origin: 'https://www.myicomfort.com',
      'Upgrade-Insecure-Requests': 1,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate',
      Referer: 'https://www.myicomfort.com/Default.aspx',
      Cookie: `iComfort=ic2; ASP.NET_SessionId=${ASPSessionID}`
    },
    data: payload
  })

  if (connect.status === 302) {
    ASPSessionID = /ASP.NET_SessionId=([^;]+);/.exec(connect.headers['set-cookie'][0])[1]
    RegisteredUserCookie = /RegisteredUserCookie=([^;]+);/.exec(connect.headers['set-cookie'][1])[1]
    console.log(`ASPSessionID=${ASPSessionID}`)
    console.log(`RegisteredUserCookie=${RegisteredUserCookie}`)
  }
}

connect().then(read)
