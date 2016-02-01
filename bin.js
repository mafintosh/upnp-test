#!/usr/bin/env node

var pump = require('pump')
var upnp = require('nat-upnp')
var publicIp = require('public-ip')
var net = require('net')
var address = require('network-address')
var minimist = require('minimist')

var argv = minimist(process.argv, {alias: {port: 'p', host: 'h'}})
var client = upnp.createClient()
var buf = ''
var port = argv.port || 0
var host = argv.host || address()

var server = net.createServer(function (sock) {
  pump(sock, sock)
})

server.listen(port, function () {
  port = server.address().port
  console.log('Server is listening on %s:%d', host, port)
  client.portMapping({
    public: port,
    private: {host: host, port: port},
    ttl: 120
  }, function (err) {
    if (err) return onend(err)

    var server = net.createServer(function (sock) {
      pump(sock, sock)
    })

    client.externalIp(function (err, ip) {
      if (err) return onend(err)
      console.log('Router says external IP is %s', ip)
      publicIp.v4(function (err, ip2) {
        if (!err) console.log('OpenDNS says external IP is %s', ip2)

        console.log('Trying to connect to %s:%d', ip, port)
        var client = net.connect(port, ip)

        client.setTimeout(10 * 1000, function () {
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
})

function onend (err) {
  if (buf === 'hello world') {
    console.log('Was able to directly connect to this machine over the internet using upnp')
    process.exit(0)
  } else {
    console.error('Could not connect to this machine over the internet using upnp' + (err ? ' (' + err.message + ')' : ''))
    process.exit(1)
  }
}
