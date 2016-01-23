var stands = require('./stands');
module.exports = {

  stands: function (event, context) {
    stands.fetch(function (err, results, headers) {
      if (err) {
        return context.fail(err);
      }

      console.log(results);
      return context.done(null, headers);
    });
  }
};
