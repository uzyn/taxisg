var express = require('express');
var app = express();
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');

var processor = require('./taxisProcessor');
var stands = require('./stands');

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
  .on('complete', function (httpResponse) {
    exec('unzip -p -P sgctaxi2014 ' + dir + 'service.sgc.zip', function (err, stdout, stderr) {
      var results = processor(stdout);

      res.append('ETag', httpResponse.headers.etag);
      res.append('Last-Modified', httpResponse.headers['last-modified']);
      res.append('Access-Control-Allow-Origin', '*');
      res.set('X-Powered-By', 'taxisg');
      return res.json(results);
    });
  }).pipe(fs.createWriteStream(dir + 'service.sgc.zip'));
});

app.get('/stands', function (req, res) {
  stands.fetch(function (err, results, headers) {
      res.append('ETag', headers.etag);
      res.append('Last-Modified', headers.lastmod);
      res.append('Access-Control-Allow-Origin', '*');
      res.set('X-Powered-By', 'taxisg');
      return res.json(results);
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('taxisg API is now listening at http://%s:%s', host, port);
});
