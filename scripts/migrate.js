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

async.doWhilst(function (callback) {
  var sourceClient = new AWS.DynamoDB.DocumentClient({
    service: sourceDDB
  });

  var scanParams = {
    TableName: 'taxisg.locations'
  };

  if (lastEvaluatedKey) {
    scanParams.ExclusiveStartKey = lastEvaluatedKey;
  }

  console.log('');
  console.log('[ Scanning next batch from ' + lastEvaluatedKey.timestamp + '... ]');

  sourceClient.scan(scanParams, function (err, data) {
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

    async.each(data.Items, function (row, eachCb) {
      migrate(row, eachCb);
    }, function (err) {
      if (err) {
        console.log('Error at async.each encountered.');
        return console.log(err);
      }

      if (lastEvaluatedKey) {
        console.log('Last key: ' + lastEvaluatedKey.timestamp);
      } else {
        console.log('DONE');
      }

      return callback(null);
    });
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

/*
migrate({
  timestamp: 2325,
  locations: [
    { asdf: 'pppppp' },
    { fpppff: 'sssssss' }
  ],
  count: 5
});
*/

function migrate(row, next) {
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
            console.log('Data for timestamp ' + row.timestamp + ' is already logged.');
            return callback(null); // Not an error.
          }
        }
        return callback(err);
      });

    },

    put: function (putCallback) {
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
        }, function (whilstCb) {
        docClient.put(params, function (err, data) {
          saved = true;
          if (err && err.retryable === true) {
            saved = false;
            return whilstCb(null);
          }
          return whilstCb(err);
        });
      }, function (err, data) {
        return putCallback(err);
      });
    },

    /**
     * Write to another table for sortability
     */
    grains: function (grainsCallback) {
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
        }, function (whilstCb) {
        docClient.put(params, function (err, data) {
          saved = true;
          if (err && err.retryable === true) {
            saved = false;
            whilstCb(null);
          }
          whilstCb(err);
        });
      }, function (err, data) {
        return grainsCallback(err);
      });
    },
  }, function (err) {
    if (err) {
      return next(err);
    } else {
      console.log(row.count + ' (' + row.locations.length + ') locations saved successfully with timestamp ' + row.timestamp);
      return next(null);
    }
  });
}
