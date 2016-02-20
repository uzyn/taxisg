var async = require('async');
var AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  //region: process.env.AWS_REGION
  region: 'ap-southeast-1' // cannot use ENV as Lambda is not yet available in Singapore
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
            TableName: process.env.AWS_DYNAMODB_LOCATIONS_TABLE,
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
              } else {
                return callback(null);
                return callback('Data for timestamp ' + timestamp + ' is already logged.');
              }
            }
            return callback(err);
          });

        },

        put: function (callback) {
          var params = {
            TableName: process.env.AWS_DYNAMODB_LOCATIONS_TABLE,
            Item: {
              timestamp: timestamp,
              locations: results
              //count: results.length
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
            return callback(err);
          });
        },

        /**
         * Write to another table for sortability
         */
        grains: function (callback) {
          var params = {
            TableName: process.env.AWS_DYNAMODB_GRAINS_TABLE,
            Item: {
              domain: 1,
              timestamp: timestamp,
              count: results.length
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
            return callback(err);
          });
        },
      }, function (err) {
        if (err) {
          return context.fail(err);
        } else {
          return context.done(err, results.length + ' locations saved successfully with timestamp ' + headers.lastmod);
        }
      });

    });
  }
};
