// wrapper to initiate the call to handler, intended for local testing

var index = require('./index.js')
index.handler({}, {}, function handleResponse (err, result) {
  if (err) {

  }
})
