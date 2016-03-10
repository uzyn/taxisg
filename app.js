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
  },

  locations(timestamp) {
    const params = {
      TableName: this.tables.locations,
      Key: {
        timestamp
      },
      ReturnConsumedCapacity: 'TOTAL'
    };

    return new Promise((resolve, reject) => {
      docClient.get(params, (err, data) => {
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
      return db.locations(data.Items[0].timestamp);
    }).then(data => {
      this.setState({
        locations: data.Item.locations
      });
    }, err => {
      console.log(err);
    });
  },

  getInitialState() {
    return {
      timestamp: 'loading...',
      count: 'loading...',
      locations: []
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
        <MapArea locations={this.state.locations} />
      </div>
    );
  }
});

const MapArea = React.createClass({
  map: null,
  heatmap: null,

  getInitialState() {
    return {
      markers: [],
      heatmapData: new google.maps.MVCArray()
    }
  },

  componentDidMount() {
    let styles = [
      {
        "stylers": [
          { "hue": "#e500ff" },
          { "invert_lightness": true },
          { "saturation": -20 },
          { lightness: -20 }
        ]
      }
    ];

    this.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 1.35763, lng: 103.816797 },
      zoom: 12,
      minZoom: 11,
      maxZoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: styles
    });

    this.heatmap = new google.maps.visualization.HeatmapLayer({
      data: this.state.heatmapData,
      radius: 20,
      map: this.map
    });
  },

  componentWillUpdate() {
    this.state.heatmapData.clear();
  },

  render() {
    for (let location of this.props.locations) {
      this.state.heatmapData.push(new google.maps.LatLng(location));
    }

    return (
      <div id="map">
        Loading map...
      </div>
    );
  }
});

ReactDOM.render(
  (
    <div>
      <Latest />
    </div>
  ),
  document.getElementById('react')
);
