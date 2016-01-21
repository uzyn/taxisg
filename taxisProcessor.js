module.exports = function (data) {
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
};
