'use strict'
var AWS = require('aws-sdk')
var moment = require('moment')
var async = require('async')

var notify = require('./lib/notify')

AWS.config.region = 'eu-west-1'
var ec2 = new AWS.EC2()
var shutdownTag = 'scheduled_shutdown'

exports.handler = (event, context, callback) => {
  console.log('\n\nLoading handler\n\n')
  var instanceList = []
  ec2.describeInstances({}, function (err, data) {
    if (err) {
      console.error(err.toString())
      callback(err)
    } else {
      for (var r = data.Reservations.length - 1; r >= 0; r--) {
        var reservation = data.Reservations[r]
        for (var i = reservation.Instances.length - 1; i >= 0; i--) {
          var instance = reservation.Instances[i]
          var tagValue = getEC2TagValues(instance, ['Name', shutdownTag])
          if (tagValue[shutdownTag] && processShutdownTag(instance, tagValue[shutdownTag])) {
            var instanceToBeShutdown = {
              name: tagValue.Name,
              id: instance.InstanceId
            }
            instanceList.push(instanceToBeShutdown)
          }
        }
      }
    }
    // initate stop for all instances in array instanceList
    stopInstances(instanceList, function processResponse (err, result) {
      if (err) {
        callback(err)
      }
      callback(null, 'Function Finished!')
    })
  })
}

function getEC2TagValues (instance, keys) {
  var result = {}
  for (var i = keys.length - 1; i >= 0; i--) {
    result[keys[i]] = null
    for (var j = instance.Tags.length - 1; j >= 0; j--) {
      if (instance.Tags[j].Key === keys[i]) {
        result[keys[i]] = instance.Tags[j].Value
      }
    }
  }
  return result
}

function processShutdownTag (instance, tagValue) {
  if (!moment(tagValue).isValid()) {
    notify.error(instance.InstanceId, 'tagValue was not converted into a timestamp')
    return false
  }
  var taggedTime = moment(tagValue)
  var timeNow = moment() || null
  if (instance.State.Name === 'running' && taggedTime && taggedTime.isBefore(timeNow)) {
    return true
  } else {
    // already stopped
    if (instance.State.Name === 'stopping' || instance.State.Name === 'stopped') {
      notify.noaction(instance.InstanceId, instance.State.Name)
    }
    // scheduled to shutdown in future
    if (instance.State.Name !== 'stopped' && taggedTime.isAfter(timeNow)) {
      notify.planned(instance.InstanceId, taggedTime)
    }
  }
  return false
}

function stopInstances (instanceList, callback) {
  async.eachOf(instanceList, function (item, key, callback) {
    notify.stopping(item.id)
    ec2.stopInstances({InstanceIds: [item.id], DryRun: false}, function (err, data) {
      if (err) {
        notify.error(item.id)
        callback(err)
      } else {
        notify.stopped(item.id)
        callback(null, 'done')
      }
    })
  }, function (err) {
    callback(err, null)
  })
}
