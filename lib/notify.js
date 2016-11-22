var AWS = require('aws-sdk')
var request = require('request')
AWS.config.update({region: 'eu-west-1'})
var sqs = new AWS.SQS()
var config = {
  fleepWebhook: process.env.NOTIFY_FLEEP_WEBHOOK,
  awsAccount: process.env.NOTIFY_SQS_ACCOUNT,
  emailSender: process.env.NOTIFY_EMAIL_SENDER
}

processNotifications()

function handleStopping (instanceId) {
  console.log('NOTIFY: stopping ' + instanceId)
}

function handleStopped (instanceId) {
  console.log('NOTIFY: stopped ' + instanceId)
  // sendSQS('ec2-scheduled-shutdown-stopped', instanceId)
  // sendFleep(config.fleepWebhook, 'Instance *' + instanceId + '* was shutdown due to schedule\n https://eu-west-1.console.aws.amazon.com/ec2/v2/home?region=eu-west-1#Instances:instanceId=' + instanceId, function handleSend(err, data){
  //   if(err){
  //     console.log(err)
  //   }
  // })
}

function handlePlanned (instanceId, taggedTime) {
  console.log('NOTIFY: planned ' + instanceId)
  console.log(instanceId + ' : ' + 'scheduled to be shutdown in: ' + taggedTime.fromNow() + ' @ ' + taggedTime.format())
}

function handleError (instanceId, message, error) {
  console.log('NOTIFY: error ' + instanceId + ' ' + message)
}

function handleNoAction (instanceId, instanceState) {
  console.log('NOTIFY: noaction ' + instanceId + ' is already: ' + instanceState)
}

function sendEmail (recipient, from, template, instanceList) {
  var ses = new AWS.SES({endpoint: 'email.eu-west-1.amazonaws.com', region: 'eu-west-1'})

  ses.sendEmail({Source: from, Destination: {ToAddresses: [recipient]}, Message: { Subject: {Data: template.subject}, Body: { Text: {Data: instanceList[0]} } }}, function (err, data) {
    if (err) {
      console.log(err)
    }
    console.log(data)
  })
}

function sendSQS (queue, message) {
  sqs.sendMessage({
    QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/' + config.awsAccount + '/ec2-scheduled-shutdown-stopped',
    MessageBody: message
  }, function (err, data) {
    if (err) {
      console.log(err)
    }
    console.log(data)
  })
}

function sendFleep (hook, message, callback) {
  var options = {
    method: 'POST',
    url: hook,
    headers: { //We can define headers too
        'Content-Type': 'application/json'
    },
    json: {message: message}
  }
  request(options, function handleFleepResponse (err, data){
    if(err) {
      callback(err)
    } else {
      callback(null, data)
    }
  })
}

function processNotifications () {
  pollSQS('ec2-scheduled-shutdown-stopped', function (err, data) {
    if (err) {
      console.log(err)
    } else if (data) {
      // failsafe
      if (data.Messages.length > 10) {
        return
      }
      for (var i = data.Messages.length - 1; i >= 0; i--) {
        sendEmail([send email to], config.emailSender, {subject: 'Instances were stopped'}, [data.Messages[i].Body])
      }
    } else {
      console.log('No notifications')
    }
  })
}

function pollSQS (queue, callback) {
  sqs.receiveMessage({
    MaxNumberOfMessages: 10,
    QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/' + config.awsAccount + '/' + queue,
    VisibilityTimeout: 20
  }, function (err, data) {
    if (err) {
      callback(err)
    } else {
      if (!data.Messages) {
        callback(null, null)
        return
      }
      for (var i = data.Messages.length - 1; i >= 0; i--) {
        sqs.deleteMessage(
          {
            QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/' + config.awsAccount + '/' + queue,
            ReceiptHandle: data.Messages[i].ReceiptHandle
          },
          function (err, data) {
            if (err) {
              console.log(err)
            } else {
              console.log(data)
            }
          }
        )
      }
      callback(null, data)
    }
  })
}

function getEmailRecipientFromTag(instance){
  for (var i = instance.Tags.length - 1; i >= 0; i--) {
    if (instance.Tags[i].Key === 'shutdown_notify') {
      return instance.Tags[i].Value
    }
  }
  return null
}

function getInstanceByID (instanceId){

}
var stopped = handleStopped
var stopping = handleStopping
var planned = handlePlanned
var error = handleError
var noaction = handleNoAction

module.exports = {
  stopped: stopped,
  stopping: stopping,
  planned: planned,
  error: error,
  noaction: noaction
}
