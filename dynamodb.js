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

      var params = {
        TableName: process.env.AWS_DYNAMODB_TABLE,
        Item: {
          timestamp: Math.floor(new Date(headers.lastmod).getTime() / 1000),
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
        if (err) {
          console.error(err);
        }
        return context.done(err, results.length + ' locations saved successfully with timestamp ' + headers.lastmod);
      });
    });
  }
};
