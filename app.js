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

/**
 * React
 */
const Latest = React.createClass({
  loadFromDb() {
    db.latest().then(data => {
      this.setState({
        timestamp: moment(data.Items[0].timestamp * 1000).format('dddd, MMMM Do YYYY, h:mm:ss a'),
        count: data.Items[0].count.toLocaleString()
      });
    }, err => {
      console.log(err);
    });
  },

  getInitialState() {
    return {
      timestampNumber: null,
      timestamp: 'loading...',
      count: 'loading...'
    };
  },

  componentDidMount() {
    this.loadFromDb();
    setInterval(this.loadFromDb, 30000);
  },

  render() {
    return (
      <div id="latest">
        <h2>Latest</h2>
        <h3>{this.state.count} taxis on the road</h3>
        <p>as at {this.state.timestamp}.</p>
      </div>
    );
  }
});

const MapArea = React.createClass({
  map: null,

  componentDidMount() {
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 1.35763, lng: 103.816797},
      zoom: 12
    });
  },

  render() {
    return (
      <div id="map">
        Map here
      </div>
    );
  }
});

ReactDOM.render(
  (
    <div>
      <Latest />
      <MapArea />
    </div>
  ),
  document.getElementById('react')
);
