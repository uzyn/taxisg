/**
 * AWS DynamoDB
 */
AWS.config.update({
  region: 'ap-southeast-1',
  accessKeyId: 'AKIAJEZJR6ZGINIW5YYQ',
  secretAccessKey: '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',
});
const docClient = new AWS.DynamoDB.DocumentClient();

const db = {
  tables: {
    grains: 'taxisg.grains',
    locations: 'taxisg.locations'
  },

  latest() {
    const params = {
      TableName: this.tables.grains,
      KeyConditionExpression: '#d = :d',
      ExpressionAttributeNames: {
        '#d': 'domain'
      },
      ExpressionAttributeValues: {
        ':d': 1
      },
      Limit: 1,
      ScanIndexForward: false,
      ReturnConsumedCapacity: 'TOTAL'
    };

    docClient.query(params, (err, data) => {
      if (err) {
        return console.log(err);
      }
      console.log(data);
      console.log(data.Items[0].timestamp);
      return data;
    });
  }
}
//db.latest();

/**
 * React
 */
const Latest = React.createClass({
  getInitialState() {
    return {
      timestamp: null,
      count: null
    };
  },

  componentDidMount() {
    db.latest();
  },

  render() {
    console.log(this.state);
    return (
      <div id="latest">
        <h3>Currently {this.state.count} taxis on the road</h3>
        <p>as at {this.state.timestamp} 30 seconds ago.</p>
      </div>
    );
  }
});

ReactDOM.render(
  <Latest />,
  document.getElementById('container')
);
