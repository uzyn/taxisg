var express = require('express');
var app = express();
var csvparse = require('csv-parse');
var request = require('request');

app.get('/', function (req, res) {
  res.send('API endpoints:\n- /1.0/locations\n- /1.0/stands\n\nMore info: https://github.com/uzyn/taxisg');
});

app.get('/1.0/locations', function (req, res) {
  res.send('Taxi locations');
});

app.get('/1.0/stands', function (req, res) {
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
          name: datum[0],
          lat: datum[2],
          lng: datum[1]
        });
      });

      res.append('ETag', httpResponse.headers.etag);
      res.append('Last-Modified', httpResponse.headers['last-modified']);
      res.set('X-Powered-By', 'taxisg');
      return res.json(results);
    });
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
