var tables = {
  grains: 'taxisg.grains',
  locations: 'taxisg.locations'
};

AWS.config.update({
  region: 'ap-southeast-1',
  accessKeyId: 'AKIAJEZJR6ZGINIW5YYQ',
  secretAccessKey: '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',
});

var docClient = new AWS.DynamoDB.DocumentClient();

var params = {
  TableName: tables.grains,
  KeyConditionExpression: '#d = :d',
  ExpressionAttributeNames: {
    '#d': 'domain'
  },
  ExpressionAttributeValues: {
    ':d': 1
  },
  Limit: 1,
  ScanIndexForward: false
};

console.log(params);

docClient.query(params, function (err, data) {
  if (err) {
    return console.log(err);
  }
  console.log(data);
  console.log(data.Items[0].timestamp);
  return data;
});
