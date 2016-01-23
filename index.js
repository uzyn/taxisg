var express = require('express');
var app = express();
var stands = require('./stands');
var taxis = require('./taxis');

app.get('/', function (req, res) {
  res.send('API endpoints:\n- /taxis\n- /stands\n\nMore info: https://github.com/uzyn/taxisg');
});

app.get('/taxis', function (req, res) {
  taxis.fetch(function (err, results, headers) {
      res.append('ETag', headers.etag);
      res.append('Last-Modified', headers.lastmod);
      res.append('Access-Control-Allow-Origin', '*');
      res.set('X-Powered-By', 'taxisg');
      return res.json(results);
  });
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
