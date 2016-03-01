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

    return new Promise((resolve, reject) => {
      docClient.query(params, (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      });
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
      count: 'loading...'
    };
  },

  componentDidMount() {
    db.latest().then(data => {
      this.setState({
        timestamp: data.Items[0].timestamp,
        count: data.Items[0].count
      });
    }, err => {
      console.log(err);
    });
  },

  render() {
    let formatted = {
      count: (Number.isInteger(this.state.count)) ? this.state.count.toLocaleString() : this.state.count
    }
    /*
    if (this.state.count) {
      formatted.count =
    }
*/
    return (
      <div id="latest">
        <h3>Currently {formatted.count} taxis on the road</h3>
        <p>as at {this.state.timestamp}.</p>
      </div>
    );
  }
});

ReactDOM.render(
  <Latest />,
  document.getElementById('container')
);
