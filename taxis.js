var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');

module.exports = {
  fetch: function (callback) {
      var randname = Math.floor(Math.random()*100000000000000);
      var tempzip = randname + 'taxi_location_service.sgc.zip';

      request.get(
        'https://s3-ap-southeast-1.amazonaws.com/taxi-taxi/prod/share/taxi_location_service.sgc.zip'
      )
      .on('complete', function (httpResponse) {
        exec('unzip -p -P sgctaxi2014 ' + tempzip, function (err, stdout, stderr) {
          if (err) {
            return callback(err);
          }

          var results = parse(stdout);
          fs.unlink(tempzip);

          return callback(null, results, {
            etag: httpResponse.headers.etag,
            lastmod: httpResponse.headers['last-modified']
          });
        });
      }).pipe(fs.createWriteStream(tempzip));
  }
};


function parse (data) {
  var len = data.length;
  var locations = [];
  var b, i, lat, lng, words;

  for (var i = 0; i < len; ++i) {
    if (i % 8 === 0) {
      if (words !== undefined && words.length === 8) {
        lat = '1.' + words[4] + words[5] + words[6];
        lng = '1' + words[0] + '.' + words[1] + words[2] + words[3];
        locations.push({
          lat: Number(lat),
          lng: Number(lng),
        });
      }
      words = [];
    }

    b = data.charCodeAt(i) - 10;
    if (b < 10 && b > 0) {
      b = '0' + b.toString();
    } else {
      b = b.toString();
    }
    words.push(b);
  }

  return locations;
}
