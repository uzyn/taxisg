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
        '#d': 'domain',
        '#t': 'timestamp',
        '#c': 'count'
      },
      ExpressionAttributeValues: {
        ':d': 1
      },
      ProjectionExpression: '#t, #c',
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

  countRange(since = null, to = null) {
    const oldestDays = 60;
    const sinceOldest = Math.floor(new Date().getTime()/1000) - oldestDays * 86400;

    if (!Number.isInteger(since) || since < sinceOldest) {
      since = Math.floor(new Date().getTime()/1000) - 30 * 86400; // 30 days default
    }

    const params = {
      TableName: this.tables.grains,
      KeyConditionExpression: '#d = :d AND #t >= :t',
      ExpressionAttributeNames: {
        '#d': 'domain',
        '#t': 'timestamp',
        '#c': 'count',
      },
      ExpressionAttributeValues: {
        ':d': 1,
        ':t': since
      },
      ProjectionExpression: '#t, #c',
      Limit: oldestDays * 86400 * 2,
      ScanIndexForward: true,
      ReturnConsumedCapacity: 'TOTAL'
    };

    return new Promise((resolve, reject) => {
      docClient.query(params, (err, data) => {
        if (err) {
          return reject(err);
        }
        // TODO: handle pagination
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
const TabGroup = React.createClass({
  isActive(name) {
    return this.state.option === name;
  },

  handleClick(name) {
    this.setState({
      option: name
    });
  },

  getInitialState() {
    return {
      option: 'live'
    }
  },

  render() {
    return (
      <div className="btn-group btn-group-lg" role="group">
        <Tab name="live" label="Name" active={this.isActive('live')}
          handleClick={this.handleClick}
        />
        <Tab name="range" label="Range" active={this.isActive('range')}
          handleClick={this.handleClick}
        />
        <Tab name="play" label="Play" active={this.isActive('play')}
          handleClick={this.handleClick}
        />
      </div>
    );
  }
});

const Tab = React.createClass({
  getClasses() {
    let classes = 'btn btn-default';
    if (this.props.active) {
      classes = classes + ' active';
    }
    return classes;
  },

  handleClick(event) {
    this.props.handleClick(this.props.name);
  },

  render() {
    return <button type="button" className={this.getClasses()} onClick={this.handleClick}>{this.props.label}</button>
  }
});

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

const Range = React.createClass({
  dygraph: null,

  loadFromDb() {
    let since = Math.floor(new Date().getTime()/1000) - this.props.daysSince * 86400;
    db.countRange(since).then(data => {
      let graphData = [];
      for (let item of data.Items) {
        if (Number.isInteger(item.count) && item.count > 0) {
          graphData.push([ new Date(item.timestamp * 1000), item.count ]);
        }
      }
      this.setState({ data: graphData });
    });
  },

  getInitialState() {
    return {
      data: []
    };
  },

  componentDidMount() {
    this.loadFromDb();
  },

  componentDidUpdate() {
    this.dygraph = new Dygraph(
      document.getElementById('graph'),
      this.state.data,
      {
        labels: [ 'time', 'Total taxis' ],
        showRangeSelector: true,
        rollPeriod: 5 * 2, // 5 minutes
        //rangeSelectorHeight: 30,
        ylabel: 'Total taxis',
        width: 1000,
        height: 400,
        legend: 'always',
        showRoller: true,
        fillGraph: true
      }
    );
  },

  render() {
    return (
      <div id="range">
        <h2>Total number of taxis for the last {this.props.daysSince} days.</h2>
        <div id="graph">
          Loading graph...
        </div>
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
      minZoom: 12,
      //maxZoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: styles
    });

    this.heatmap = new google.maps.visualization.HeatmapLayer({
      data: this.state.heatmapData,
      radius: 15,
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
    <div id="app-proper">
      <div className="text-center">
        <h1>Singapore taxis</h1>
        <TabGroup />
      </div>
      <div>
        <Range daysSince="7" />
        <Latest />
      </div>
    </div>
  ),
  document.getElementById('app')
);

