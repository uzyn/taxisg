/**
 * AWS DynamoDB
 */
AWS.config.update({
  region: 'ap-southeast-1',
  accessKeyId: 'AKIAJEZJR6ZGINIW5YYQ',
  secretAccessKey: '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',
});

const docClient = new AWS.DynamoDB.DocumentClient();

let ddbConsumption = 0;

const db = {
  locationsAcrossLoadingProgress: 0,
  tables: {
    grains: 'taxisg.grains',
    locations: 'taxisg.locations'
  },
  state: {
    grains: null,
    latestTimestamp: null
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
        ddbConsumption += data.ConsumedCapacity.CapacityUnits;
        return resolve(data);
      });
    });
  },

  earliest() {
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
      ScanIndexForward: true,
      ReturnConsumedCapacity: 'TOTAL'
    };

    return new Promise((resolve, reject) => {
      docClient.query(params, (err, data) => {
        if (err) {
          return reject(err);
        }
        ddbConsumption += data.ConsumedCapacity.CapacityUnits;
        return resolve(data);
      });
    });
  },

  countRange(since = null, to = null, lastEvaluatedKey = null) {
    const oldestDays = 60;
    const sinceOldest = moment().subtract(oldestDays, 'days').unix();

    if (!Number.isInteger(since) || since < sinceOldest) {
      since = moment().subtract(30, 'days').unix();
    }

    const params = {
      TableName: this.tables.grains,
      KeyConditionExpression: '#d = :d AND #t >= :ts',
      ExpressionAttributeNames: {
        '#d': 'domain',
        '#t': 'timestamp',
        '#c': 'count',
      },
      ExpressionAttributeValues: {
        ':d': 1,
        ':ts': since
      },
      ProjectionExpression: '#t, #c',
      ScanIndexForward: true,
      ReturnConsumedCapacity: 'TOTAL'
    };

    if (Number.isInteger(to) && to > since) {
      params.KeyConditionExpression = '#d = :d AND #t BETWEEN :ts AND :tt';
      params.ExpressionAttributeValues[':tt'] = to;
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    return new Promise((resolve, reject) => {
      docClient.query(params, (err, data) => {
        if (err) {
          return reject(err);
        }

        if (data.LastEvaluatedKey) {
          this.countRange(since, to, data.LastEvaluatedKey).then(nextData => {
            data.Items = data.Items.concat(nextData.Items);
            data.Count += nextData.Count;
            data.scannedCount += nextData.scannedCount;
            if (nextData.ConsumedCapacity) {
              data.ConsumedCapacity.CapacityUnits += nextData.ConsumedCapacity.CapacityUnits;
            }
            return resolve(data);
          }, err => {
            return reject(err);
          });
        } else {
          ddbConsumption += data.ConsumedCapacity.CapacityUnits;
          return resolve(data);
        }
      });
    });
  },

  locations(timestamp) {
    console.log('Loading locations for ' + moment(timestamp * 1000).format());
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
        ddbConsumption += data.ConsumedCapacity.CapacityUnits;
        return resolve(data);
      });
    });
  },

  locationsAcross(timestamps, step = 20) {
    if (step > 1) {
      timestamps = timestamps.filter(
        (timestamp, i) => {
          return (i % step === 0);
        }
      );
    }
    this.locationsAcrossLoadingProgress = 0;

    return new Promise((resolve, reject) => {
      const execute = (results = [], iterator = 0) => {
        let timestamp = timestamps[iterator];
        this.locationsAcrossLoadingProgress = Math.round((iterator + 1) / timestamps.length * 100 * 10) / 10;
        this.locations(timestamp).then(data => {
          results.push(data);

          if (iterator < timestamps.length - 1) {
            return execute(results, iterator + 1);
          } else {
            return resolve(results);
          }
        }, err => {
          return reject(err);
        });
      }
      execute();
    });
  }
}

/**
 * Cache
 */
const cache = {
  snapshotsRange: null,
  earliestTimestamp: null,
  animations: []
};

/**
 * React
 */
const App = React.createClass({
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
      option: 'snapshots'
      //option: 'animation',
    }
  },

  render() {
    return (
      <div id="app-proper">
        <DynamoDBStatus ddbConsumption={this.props.ddbConsumption} />
        <div className="text-center">
          <h1>Singapore taxis</h1>
          <div className="btn-group btn-group-lg" role="group">
            <Tab name="snapshots" label="Snapshots" active={this.isActive('snapshots')}
              handleClick={this.handleClick}
            />
            <Tab name="animation" label="Animation" active={this.isActive('animation')}
              handleClick={this.handleClick}
            />
          </div>
        </div>
        <TabContent active={this.state.option} />
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

const TabContent = React.createClass({
  render() {
    if (this.props.active === 'animation') {
      return <Animation />;
    } else {
      return <Snapshots />;
    }
  }
});

const Snapshots = React.createClass({
  render() {
    return (
      <div>
        <Range daysSince="14" />
        <Latest />
      </div>
    );
  }
});

const Animation = React.createClass({
  loadingProgressTimer: null,

  getInitialState() {
    return {
      rangeAllowed: {
        min: moment().subtract(30, 'day').unix(),
        max: moment().subtract(1, 'day').endOf('day').unix(),
      },
      date: null,
      grains: null,
      dayLocations: null,
      mapLoading: false,
      loadingProgress: 0
    }
  },

  componentDidMount() {
    if (!cache.earliestTimestamp) {
      db.earliest().then(data => {
        cache.earliestTimestamp = data.Items[0].timestamp;
        this.setState({
          rangeAllowed: {
            min: moment(cache.earliestTimestamp * 1000).startOf('day').unix(),
            max: moment().subtract(1, 'day').endOf('day').unix(),
          },
        });
      });
    } else {
      this.setState({
        rangeAllowed: {
          min: moment(cache.earliestTimestamp * 1000).startOf('day').unix(),
          max: moment().subtract(1, 'day').endOf('day').unix(),
        },
      });
    }
  },

  handleChange(event) {
    const date = event.target.value;
    const dayStart = moment(event.target.value).startOf('day').unix();
    const dayEnd = moment(event.target.value).endOf('day').unix();

    if (dayStart >= this.state.rangeAllowed.min && dayEnd <= this.state.rangeAllowed.max) {
      if (!cache.animations[date]) {
        db.countRange(dayStart, dayEnd).then(data => {
          this.setState({
            date,
            grains: data.Items,
            mapLoading: true,
            loadingProgress: 0
          });
          this.monitorLoadingProgress();
          return db.locationsAcross(data.Items.map(
            (item) => item.timestamp
          ));
        }).then(data => {
          cache.animations[date] = {
            grains: this.state.grains,
            dayLocations: data
          };
          this.setState({
            mapLoading: false,
            dayLocations: data
          });
        });
      } else {
        this.setState({
          date,
          grains: cache.animations[date].grains,
          mapLoading: true,
          loadingProgress: 100
        });

        // Force remounting of map
        setTimeout(() => {
          this.setState({
            dayLocations: cache.animations[date].dayLocations,
            mapLoading: false
          });
        }, 500);
      }
    }
  },

  monitorLoadingProgress() {
    if (!this.loadingProgressTimer) {
      this.loadingProgressTimer = setInterval(() => {
        if (db.locationsAcrossLoadingProgress !== this.state.loadingProgress) {
          this.setState({
            loadingProgress: db.locationsAcrossLoadingProgress
          });
        }
      }, 200);
    }
  },

  clearLoadingProgressMonitor() {
    if (this.loadingProgressTimer) {
      clearInterval(this.loadingProgressTimer);
      this.loadingProgressTimer = null;
    }
  },

  render() {
    let mapWithPlayer = '';
    if (this.state.mapLoading) {
      if (this.state.loadingProgress >= 99) {
        mapWithPlayer = <h3 className="text-center"><p>&nbsp;</p>Processing animation data...</h3>
      } else {
        mapWithPlayer = (
          <h3 className="text-center">
            <p>&nbsp;</p>
            {this.state.loadingProgress}%<br />
            Loading animation data...
          </h3>
        );
      }
    } else {
      this.clearLoadingProgressMonitor();
      if (this.state.dayLocations) {
        mapWithPlayer = <MapWithPlayer data={this.state.dayLocations} />
      }
    }

    return (
      <div>
        <div id="animation-date-selector">
          <h2>Select date</h2>
          <h4>
            <input type="date"
              min={moment(this.state.rangeAllowed.min * 1000).format('YYYY-MM-DD')}
              max={moment(this.state.rangeAllowed.max * 1000).format('YYYY-MM-DD')}
              onChange={this.handleChange}
            />
          </h4>
        </div>
        <AnimationLineChart data={this.state.grains} date={this.state.date} />
        {mapWithPlayer}
      </div>
    );
  }
});

const AnimationLineChart = React.createClass({
  render() {
    let graph = null;
    if (this.props.data) {
      const options = {
        showRangeSelector: false,
        height: 180,
        dateWindow: [ moment(this.props.data[0].timestamp * 1000).startOf('day'), moment(this.props.data[0].timestamp * 1000).endOf('day') ]
      }

      graph = (
        <div>
          <h2 className="text-center">{ moment(this.props.date, 'YYYY-MM-DD').format('dddd, MMMM Do, YYYY') }</h2>
          <Graph grains={this.props.data} options={options} />
        </div>
      );
    }

    return (
      <div>
      {graph}
      </div>
    );
  }
});

const MapWithPlayer = React.createClass({
  map: null,
  mapDiv: null,
  heatmap: null,

  getInitialState() {
    return {
      timestamps: [],
      dayLocations: [],
      pointer: null,
      heatmapDatasets: []
    }
  },

  componentDidMount() {
    this.processData();

    let styles = [
      {
        stylers: [
          { hue: '#e500ff' },
          { invert_lightness: true },
          { saturation: -20 },
          { lightness: -20 }
        ]
      }
    ];

    this.map = new google.maps.Map(this.mapDiv, {
      center: { lat: 1.35763, lng: 103.816797 },
      zoom: 12,
      minZoom: 12,
      //maxZoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: styles
    });

    this.heatmap = new google.maps.visualization.HeatmapLayer({
      //data: this.state.heatmapData,
      radius: 15,
      map: this.map
    });
  },

  processData() {
    let timestamps = [];
    let dayLocations = [];
    let heatmapDatasets = [];

    for (let row of this.props.data) {
      timestamps.push(row.Item.timestamp);
      dayLocations[row.Item.timestamp] = row.Item.locations;
      heatmapDatasets[row.Item.timestamp] = new google.maps.MVCArray();

      for (let location of row.Item.locations) {
        heatmapDatasets[row.Item.timestamp].push(new google.maps.LatLng(location));
      }
    }

    this.setState({
      timestamps,
      dayLocations,
      heatmapDatasets,
      pointer: 0
    });
  },

  moveFwd(by = 1) {
    let pointer = this.state.pointer + by;

    if (pointer >= this.state.timestamps.length) {
      pointer = 0;
    }
    if (pointer < 0) {
      pointer = this.state.timestamps.length - 1;
    }

    this.setState({
      pointer
    });
  },

  render() {
    let timestamp = this.state.timestamps[this.state.pointer];
    if (this.state.dayLocations[timestamp]) {
      this.heatmap.setData(this.state.heatmapDatasets[timestamp]);
    }

    return (
      <div>
        <h3 className="text-center">{moment(timestamp * 1000).format('h:mm:ss a')}</h3>
        <div className="map" ref={(div) => this.mapDiv = div}></div>
        <PlayerButtons moveFwd={this.moveFwd} />
      </div>
    );
  }
});

const PlayerButtons = React.createClass({
  playTimer: null,

  getInitialState() {
    return {
      playing: false
    }
  },

  handlePlay() {
    let shouldPlay = !this.state.playing;

    if (shouldPlay) {
      this.playTimer = setInterval(() => this.props.moveFwd(1), 750);
    } else {
      clearInterval(this.playTimer);
    }

    this.setState({
      playing: shouldPlay
    });
  },

  handleStep(forward = true, speed = 1) {
    let by = speed;
    if (!forward) {
      by = -1 * speed;
    }
    this.props.moveFwd(by);
  },

  render() {
    let classes = {
      back: 'btn btn-default',
      play: 'btn btn-default btn-primary',
      fwd: 'btn btn-default'
    };
    let labels = {
      play: 'Play'
    }

    if (this.state.playing) {
      classes.back += ' disabled';
      classes.fwd += ' disabled';
      classes.play += ' btn-info';
      labels.play = 'Pause';
    }

    return (
      <div className="player-buttons">
        <div className="btn-group">
          <button type="button" className={classes.back} onClick={() => this.handleStep(false, 5)}>&lt;&lt;</button>
          <button type="button" className={classes.back} onClick={() => this.handleStep(false)}>&lt;</button>
          <button type="button" className={classes.play} onClick={this.handlePlay}>{labels.play}</button>
          <button type="button" className={classes.fwd} onClick={() => this.handleStep(true)}>&gt;</button>
          <button type="button" className={classes.fwd} onClick={() => this.handleStep(true, 5)}>&gt;&gt;</button>
        </div>
      </div>
    );
  }
});

const Latest = React.createClass({
  refreshTimer: null,

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
      locations: [],
      live: true
    };
  },

  componentDidMount() {
    this.loadFromDb();
    this.refreshTimer = setInterval(this.loadFromDb, 30000);
  },

  componentWillUnmount() {
    clearInterval(this.refreshTimer);
  },

  toggleLiveButton(event) {
    this.setState({
      live: !this.state.live
    });
  },

  render() {
    let liveLabel = null;
    let liveBtnChecked = '';
    if (this.state.live) {
      liveLabel = <span className="label label-danger">LIVE</span>;
    }

    return (
      <div id="latest">
        <div className="row">
          <div className="col-md-8">
            <h3>{this.state.count} taxis on the road</h3>
            <h5>as at {this.state.timestamp}. {liveLabel}</h5>
          </div>
          <div className="col-md-4 text-right live-button-section">
            <div className="live-button-section-content">
              <div className="live-toggle">
                <label>
                  <input type="checkbox" defaultChecked onChange={this.toggleLiveButton} /> Live
                </label>
              </div>
              <p>Live view auto refreshes every 30 seconds.</p>
            </div>
          </div>
        </div>
        <MapArea locations={this.state.locations} />
      </div>
    );
  }
});

const Range = React.createClass({
  loadData() {
    if (!cache.snapshotsRange) {
      let since = moment().subtract(this.props.daysSince, 'days').unix();
      db.countRange(since).then(data => {
        cache.snapshotsRange = data;
        this.setState({ data });
      }, err => {
        console.log(err);
      });
    } else {
      this.setState({ data: cache.snapshotsRange });
    }
  },

  getInitialState() {
    return {
      data: null
    };
  },

  componentDidMount() {
    this.loadData();
  },

  render() {
    let graph = null;
    if (this.state.data) {
      const options = {
      };
      graph = <Graph grains={this.state.data.Items} options={options} />;
      console.log(this.state.data);
    }

    return (
      <div>
        <h2 className="text-center">Snapshots from the last {this.props.daysSince} days</h2>
        {graph}
        <p className="text-center">Click on a point on graph to view snapshot on the map below.</p>
      </div>
    );
  }
});

const MapArea = React.createClass({
  map: null,
  mapDiv: null,
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
        stylers: [
          { hue: '#e500ff' },
          { invert_lightness: true },
          { saturation: -20 },
          { lightness: -20 }
        ]
      }
    ];

    this.map = new google.maps.Map(this.mapDiv, {
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
      <div className="map" ref={(div) => this.mapDiv = div}>
        Loading map...
      </div>
    );
  }
});

const Graph = React.createClass({
  graphDiv: null,

  getInitialState() {
    return {
      options: {
        labels: [ 'Time', 'Taxis' ],
        showRangeSelector: true,
        rollPeriod: 5 * 2, // 5 minutes
        rangeSelectorHeight: 50,
        width: 1200,
        height: 400,
        legend: 'always',
        showRoller: true,
        fillGraph: true,
        dateWindow: [ moment().subtract(5, 'days'), moment() ],
        clickCallback: (event, date) => {
          console.log(date);
        }
      }
    }
  },

  convertData(grains) {
    if (!grains) {
      return null;
    }

    let graphData = [];
    for (let item of grains) {;
      if (Number.isInteger(item.count) && item.count > 0) {
        graphData.push([ new Date(item.timestamp * 1000), item.count ]);
      }
    }
    return graphData;
  },

  componentDidMount() {
    this.renderGraph();
  },
  componentDidUpdate() {
    this.renderGraph();
  },

  renderGraph() {
    let options = this.state.options;
    for (let option in this.props.options) {
      this.state.options[option] = this.props.options[option];
    }
    this.dygraph = new Dygraph(
      this.graphDiv,
      this.convertData(this.props.grains),
      this.state.options
    );
  },

  render() {
    return (
      <div ref={(div) => this.graphDiv = div}>
        Loading graph...
      </div>
    );
  }
});

const DynamoDBStatus = React.createClass({
  getInitialState() {
    return {
      ddbConsumption
    }
  },

  componentDidMount() {
    setInterval(() => {
      if (ddbConsumption !== this.state.ddbConsumption) {
        this.setState({
          ddbConsumption
        });
      }
    }, 200);
  },

  render() {
    return (
      <div className="dynamodb-status">
        {this.state.ddbConsumption} DynamoDB capacity units consumed.
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('app')
);

