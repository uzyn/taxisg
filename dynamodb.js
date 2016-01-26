var async = require('async');
var AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
  // Log of taxis locations
  // Trigger this every 30 seconds
  logTaxis: function (event, context) {
    require('./taxis').fetch(function (err, results, headers) {
      if (err) {
        return context.fail(err);
      }
      var timestamp = Math.floor(new Date(headers.lastmod).getTime() / 1000);

      async.series({
        validate: function (callback) {
          var params = {
            TableName: process.env.AWS_DYNAMODB_TABLE,
            Select: 'COUNT',
            KeyConditionExpression: "#ts = :tttt",
            ExpressionAttributeNames: {
              '#ts': 'timestamp'
            },
            ExpressionAttributeValues: {
              ":tttt": timestamp
            }
          };

          docClient.query(params, function (err, data) {
            if (!err) {
              if (data.Count === 0) {
                return callback(null);
              } else {
                return callback(data);
              }
            }
            return callback(err);
          });

        },

        put: function (callback) {
          var params = {
            TableName: process.env.AWS_DYNAMODB_TABLE,
            Item: {
              timestamp: timestamp,
              locations: results
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
              callback(err, data);
            });
          }, function (err, data) {
            return callback(err, results, headers);
          });
        }
      }, function (err, results, headers) {
        if (err) {
          console.log(err);
          return context.fail(err);
        } else {
          return context.done(err, results.length + ' locations saved successfully with timestamp ' + headers.lastmod);
        }
      });

    });
  }
};
