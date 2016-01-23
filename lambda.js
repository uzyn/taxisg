module.exports = {

  taxis: function (event, context) {
    require('./taxis').fetch(function (err, results, headers) {
      if (err) {
        return context.fail(err);
      }

      console.log(results);
      return context.done(null, headers);
    });
  },

  stands: function (event, context) {
    require('./stands').fetch(function (err, results, headers) {
      if (err) {
        return context.fail(err);
      }

      console.log(results);
      return context.done(null, headers);
    });
  }
};
