# Lennox Monitor

This tool leverages the [Lennox iComfort web API](https://www.myicomfort.com/) to create logs

## Overview

The tool polls the current activity of your system and dumps a `json` report for each call.
It also consolidates the relevant information in a `records.csv` file.
Everything is stored under the `data` folder.

## Configuration

The following environment variables must be defined
* **LENNOX_USERNAME** account user name
* **LENNOX_PASSWORD** account password
* **OPENWEATHER_URL** [Open Weather](https://openweathermap.org/) API call to get temperature at your location (must contain your location and key)

By default, the polling interval is every second but it can be changed with **LENNOX_DELAY** (in ms).

It is recommended to use a [`.env`](https://www.npmjs.com/package/dotenv) file to store these settings
and run the tool with [PM2](https://pm2.keymetrics.io/).
