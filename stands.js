var request = require('request');
var csvparse = require('csv-parse');

module.exports = {

  fetch: function (callback) {
    request.get({
      url: 'https://s3-ap-southeast-1.amazonaws.com/taxi-taxi/prod/share/taxi_stands.csv'
    }, function (err, httpResponse, body) {
      if (err) {
        return callback(err);
      }

      csvparse(body, function (err, data) {
        if (err) {
          return callback(err);
        }

        var results = [];
        data.forEach(function(datum) {
          results.push({
            id: datum[0],
            lat: Number(datum[2]),
            lng: Number(datum[1])
          });
        });

        return callback(null, results, {
          etag: httpResponse.headers.etag,
          lastmod: httpResponse.headers['last-modified']
        });
      });
    });
  }
};
