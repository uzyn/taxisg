var express = require('express');
var app = express();
var exec = require('child_process').exec;
var fs = require('fs');
var csvparse = require('csv-parse');
var request = require('request');
var processor = require('./taxisProcessor');

app.get('/', function (req, res) {
  res.send('API endpoints:\n- /taxis\n- /stands\n\nMore info: https://github.com/uzyn/taxisg');
});

app.get('/taxis', function (req, res) {
  var randname = Math.floor(Math.random()*100000000000000);
  var dir = 'tmp/' + randname + '/';
  if(!fs.existsSync('tmp/')){
    fs.mkdirSync('tmp/');
  }
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }

  request.get(
    'https://s3-ap-southeast-1.amazonaws.com/taxi-taxi/prod/share/taxi_location_service.sgc.zip'
  )
  .on('complete', function (response) {
    exec('unzip -p -P sgctaxi2014 ' + dir + 'service.sgc.zip', function (err, stdout, stderr) {
      var results = processor(stdout);

      res.append('ETag', response.headers.etag);
      res.append('Last-Modified', response.headers['last-modified']);

      res.append('Access-Control-Allow-Origin', '*');
      res.set('X-Powered-By', 'taxisg');
      return res.json(results);
    });
  }).pipe(fs.createWriteStream(dir + 'service.sgc.zip'));
});

app.get('/stands', function (req, res) {
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

      res.append('ETag', httpResponse.headers.etag);
      res.append('Last-Modified', httpResponse.headers['last-modified']);
      res.append('Access-Control-Allow-Origin', '*');
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
