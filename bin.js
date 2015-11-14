#!/usr/bin/env node

var pump = require('pump')
var upnp = require('nat-upnp')
var net = require('net')

var client = upnp.createClient()
var buf = ''

client.portMapping({
  public: 33658,
  private: 33658,
  ttl: 0
}, function (err) {
  if (err) return onend()

  var server = net.createServer(function (sock) {
    pump(sock, sock)
  })

  server.listen(33658, function () {
    client.externalIp(function (err, ip) {
      if (err) return onend()

      var client = net.connect(33658, ip)

      client.setTimeout(20 * 1000, function () {
        client.destroy()
      })

      client.setEncoding('utf-8')
      client.end('hello world')

      client.on('error', onend)
      client.on('close', onend)
      client.on('end', onend)
      client.on('data', function (data) {
        buf += data
      })
    })
  })
})

function onend () {
  if (buf === 'hello world') {
    console.log('✓ Was able to directly connect to this machine over the internet using upnp')
    process.exit(0)
  } else {
    console.error('✗ Could not connect to this machine over the internet using upnp')
    process.exit(1)
  }
}
