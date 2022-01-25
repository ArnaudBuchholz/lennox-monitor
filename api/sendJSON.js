export function sendJSON (response, value) {
  const json = JSON.stringify(value)
  response.writeHead(200, {
    'content-type': 'application/json',
    'content-length': json.length
  })
  response.end(json)
}
