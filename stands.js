var request = require('request');
var csvparse = require('csv-parse');

module.exports = {

  fetch: function (callback) {
    request.get({
      url: 'https://s3-ap-southeast-1.amazonaws.com/taxi-taxi/prod/share/taxi_stands.csv'
    }, function (err, httpResponse, body) {
      if (err) {
        console.log(httpResponse);
        console.log(body);
        return res.status(httpResponse.statusCode).send('Error');
      }

      csvparse(body, function (err, data) {
        if (err) {
          console.log(err);
          return res.status(httpResponse.statusCode).send('Error');
        }

        var results = [];
        data.forEach(function(datum) {
          results.push({
            id: datum[0],
            lat: datum[2],
            lng: datum[1]
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
