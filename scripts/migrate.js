/**
 * Migration from Oregon to Singapore
 * with some minor changes in schems
 */
var async = require('async');
var AWS = require('aws-sdk');
/*
AWS.config.update({
  region: 'ap-southeast-1'
});
*/

var sourceDDB = new AWS.DynamoDB({
  region: 'us-west-2'
});

var lastEvaluatedKey = false;
var count = 0;

async.doWhilst( function (callback) {
  var scanParams = {
    TableName: 'taxisg.locations'
  };

  if (lastEvaluatedKey) {
    scanParams.ExclusiveStartKey = lastEvaluatedKey;
  }

  sourceDDB.scan(scanParams, function (err, data) {
    if (err) {
      if (err.retryable === true) {
        console.log('Retryable error');
        return callback(null, null); // to retry
      } else {
        return callback(err);
      }
    }

    if (data.LastEvaluatedKey) {
      lastEvaluatedKey = data.LastEvaluatedKey;
    } else {
      lastEvaluatedKey = false;
    }

    // Save
    count = count + data.Count;
    console.log(count + ' rows migrated.');

    if (lastEvaluatedKey) {
      console.log('Last key: ' + lastEvaluatedKey.timestamp.N);
    } else {
      console.log('DONE');
    }

    return callback(null, data);
  });
}, function () {
  return lastEvaluatedKey;
}, function (err, data) {
  return callback(err);
});
