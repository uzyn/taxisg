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

var destDDB = new AWS.DynamoDB({
  region: 'ap-southeast-1'
});

var lastEvaluatedKey = false;
var count = 0;
/*
async.doWhilst(function (callback) {
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
        return callback(null); // to retry
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

    return callback(null);
  });
}, function () {
  return lastEvaluatedKey;
}, function (err) {
  if (err) {
    console.log('Halted');
    return console.log(err);
  } else {
    return console.log('Completed successfully. Final count: ' + count);
  }
});
*/

migrate({
  timestamp: 2325,
  locations: [
    { asdf: 'pppppp' },
    { fpppff: 'sssssss' }
  ],
  count: 5
});

function migrate(row) {
  var docClient = new AWS.DynamoDB.DocumentClient({
    service: destDDB
  });
  var grainsTable = 'testsg.grains';
  var locationsTable = 'testsg.locations';

  async.series({
    validate: function (callback) {
      var params = {
        TableName: locationsTable,
        Select: 'COUNT',
        KeyConditionExpression: "#ts = :tttt",
        ExpressionAttributeNames: {
          '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
          ":tttt": row.timestamp
        }
      };

      docClient.query(params, function (err, data) {
        if (!err) {
          if (data.Count === 0) {
          } else {
            return callback('Data for timestamp ' + row.timestamp + ' is already logged.');
          }
        }
        return callback(err);
      });

    },

    put: function (callback) {
      var params = {
        TableName: locationsTable,
        Item: {
          timestamp: row.timestamp,
          locations: row.locations
        }
      };

      var saved = false;
      async.whilst( function() {
          return !saved;
        }, function (callback) {
        docClient.put(params, function (err, data) {
          saved = true;
          if (err && err.retryable === true) {
            saved = false;
          }
          callback(err);
        });
      }, function (err, data) {
        return callback(err);
      });
    },

    /**
     * Write to another table for sortability
     */
    grains: function (callback) {
      var params = {
        TableName: grainsTable,
        Item: {
          domain: 1,
          timestamp: row.timestamp,
          count: row.count
        }
      };

      var saved = false;
      async.whilst( function() {
          return !saved;
        }, function (callback) {
        docClient.put(params, function (err, data) {
          saved = true;
          if (err && err.retryable === true) {
            saved = false;
          }
          callback(err);
        });
      }, function (err, data) {
        return callback(err);
      });
    },
  }, function (err) {
    if (err) {
      return console.log(err);
    } else {
      console.log(row.locations);
      return console.log(row.count + ' (' + row.locations.length + ') locations saved successfully with timestamp ' + row.timestamp);
    }
  });
}
