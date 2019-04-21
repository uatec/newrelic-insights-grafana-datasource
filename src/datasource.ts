///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';

export type Series = {
  target: string;
  datapoints: [number, number][]
}

export type GrafanaScopedVar = {
  selected: Boolean;
  text: String;
  value: String;
}

export type GrafanaScopedVars = [string, GrafanaScopedVar][]

function concat<T>(parts: T[][]): T[] {
  return Array.prototype.concat(...parts);
}

export default class NewRelicInsightsDataSource {  
  id: number;
  name: string;
  headers: {[Identifier: string]: string}
  accountNumber: string;
  withCredentials: any;
  url: string;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;

    this.withCredentials = instanceSettings.withCredentials;
    this.url = instanceSettings.url;
  }

  doRequest(options) {
    options.headers = this.headers;
    options.withCredentials = this.withCredentials;

    return this.backendSrv.datasourceRequest(options);
  }


  private getData(target, rangeConfig: string, accuracyConfig: string, variables: GrafanaScopedVars): Promise<Series[]> {

    // let tableName = 'POS_PLACE_ORDER_RESPONSE';
    // let queryFields = ['count(success)'];
    let query = target.query;
    if (!target.query.toLowerCase().includes('since') && !target.query.toLowerCase().includes('until')) {
      query += ' ' + rangeConfig;
    }
    if (!target.query.toLowerCase().includes('timeseries')) {
      query += ' timeseries ' + accuracyConfig;
    }
    
    Object.keys(variables).forEach(key => {
      const variable: GrafanaScopedVar  = variables[key];
      console.log(`replacing $${key} with ${variable.value}`);
      while (query.includes(`$${key}`)) {
        query = query.replace(`$${key}`, variable.value);
      }
    });

    var queryParams = { 
      // "nrql": `SELECT ${queryFields.join()} FROM ${tableName} SINCE ${options.range.from} until ${options.range.to} timeseries auto`
      nrql: encodeURI(query)
    };

    return this.doRequest({
      url: `${this.url}/insights_api/query?` + Object.keys(queryParams).map(k => `${k}=${queryParams[k]}`).join('&'),
      method: 'GET'
    }).
    then(response => {
      console.log(response);

      if (response.data.timeSeries) {
        return Object.keys(response.data.timeSeries[0].results[0]).map(targetKey => {
          return {
            target: target.alias || "count",
            datapoints: response.data.timeSeries.map(i => [i.results[0][targetKey], i.beginTimeSeconds*1000])
          };
        });
      }

      if (response.data.facets) {
        var out = response.data.facets.map(f => {
          return Object.keys(f.timeSeries[0].results[0]).map(targetKey => {
            return {
              target: target.alias ? `${target.alias} - ${f.name}` : f.name,
              datapoints: f.timeSeries.map(i => [i.results[0][targetKey], i.beginTimeSeconds*1000])
            };
          });

        });
        return concat(out);
      }

      throw new Error("response with no facets or timeseries");
    });
  }
  
  calculateInterval(from, to): string{
    var interval = Math.floor((to - from) / 350);
    return interval.toString();
  }

  query(options): Promise<{ data: Series[]}> {
    
    // {
    //   "range": { "from": "2015-12-22T03:06:13.851Z", "to": "2015-12-22T06:48:24.137Z" },
    //   "interval": "5s",
    //   "targets": [
    //     { "refId": "B", "target": "upper_75" },
    //     { "refId": "A", "target": "upper_90" }
    //   ],
    //   "format": "json",
    //   "maxDataPoints": 2495 //decided by the panel
    // }
    if (options.targets.length == 0) { return Promise.resolve({ data: [] }); }
    // todo: validate no time info in query
    const rangeConfig = `SINCE ${options.range.from} UNTIL ${options.range.to}`;
    
    const accuracyConfig = this.calculateInterval(options.range.from, options.range.to);

    return Promise.all(options.targets.map(t => {
      return this.getData(t, rangeConfig, accuracyConfig, options.scopedVars);
    }))
    .then((data: Series[][]) => {
      var out = {
        data: concat<Series>(data)
      };
      console.log(out);
      return out;
    });


    // return Promise.resolve({data: [
    //   {
    //     "target":"upper_75",
    //     "datapoints":[
    //       [622, 1450754160000],
    //       [365, 1450754220000]
    //     ]
    //   },
    //   {
    //     "target":"upper_90",
    //     "datapoints":[
    //       [861, 1450754160000],
    //       [767, 1450754220000]
    //     ]
    //   }
    // ]});
  }

  annotationQuery(options) {
    throw new Error("Annotation Support not implemented yet.");
  }

  metricFindQuery(query: string) {
    throw new Error("Template Variable Support not implemented yet.");
  }

  testDatasource() {
    return this.doRequest({
      url: `${this.url}/insights_api/query?nrql=select+1+from+SyntheticCheck`,
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }
}