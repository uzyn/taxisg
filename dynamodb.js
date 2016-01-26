var async = require('async');
var AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
  // Periodically recording of taxis locations
  taxis: function (event, context) {
    /*
    var params = {
      TableName: process.env.AWS_DYNAMODB_TABLE,
      Item: {
        timestamp: Math.floor(Date.now() / 1000),
        coord: '1,2',
        lat: 1,
        lng: 3
      }
    };
    console.log(params);
    docClient.put(params, function (err, data) {
      console.log(err);
      console.log(data);
    //  process.exit();
    });
    */

    require('./taxis').fetch(function (err, results, headers) {
      if (err) {
        return context.fail(err);
      }

      var params = {
        TableName: process.env.AWS_DYNAMODB_TABLE
      };
      var timestamp = Math.floor(new Date(headers.lastmod).getTime() / 1000);

      var q = async.queue(function (location, callback) {
        params['Item'] = {
          timestamp: timestamp,
          coord: location.lat + ',' + location.lng
        }
        console.log(q.length() + ' left in queue');
        docClient.put(params, function (err, data) {
          if (err) {
            console.log(err);

            if (err.retryable === true) {
              console.log('Added current one to retry');
              q.push(location);
            }
          }
          callback(err);
        });
      }, process.env.AWS_DYNAMODB_WRITE_CONCURRENCY);

      q.drain = function() {
        return console.log(results.length + ' locations saved');
      };

      console.log('[DONE] ' + results.length + ' locations obtained. Saving...');
      results.forEach(function (location) {
        q.push(location);
      });

      //console.log(results);
      //return context.done(null, results);
    });
  }
};
