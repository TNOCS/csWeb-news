import http = require('http');
import path = require('path');
import fs = require('fs');
import request = require('request');
import express = require('express');
import calais = require('calais-entity-extractor');

interface IGeoJsonGeometry {
    type: string;
    coordinates: number[] | number[][] | number[][][];
}

interface IFeature {
    geometry: IGeoJsonGeometry;
    properties?: { [id: string]: any[] };
    sensors?: {
        [id: string]: any[];
    };
    id: string;
};

/** Options */
export class NewsSourceOptions {
    /** If true, set headers to enable CORRS. */
    corrs: boolean = true;
    /** source folder. If not set, uses ./newsfeatures */
    newsFolder: string = path.join(__dirname, 'newsfeatures');
    calaisApi: string = '';
    alchemyApi: string = '';
    keywords: string[] = [];
    updateInterval: number = 3600;
};

export class NewsSource {
    private options: NewsSourceOptions;
    private alchemyFeed: AlchemyFeed;
    private calaisSource: CalaisSource;

    constructor(app: express.Express, options?: NewsSourceOptions) {
        var defaultOptions = new NewsSourceOptions();
        if (!options) options = defaultOptions;
        this.options = options;
        if (!this.options.updateInterval || this.options.updateInterval < 2) this.options.updateInterval = 600;

        // enable corrs
        if ((options && typeof options.corrs !== 'undefined' && options.corrs) || defaultOptions.corrs) {
            app.use(function(req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                next();
            });
        }

        this.alchemyFeed = new AlchemyFeed(app, options.alchemyApi);
        this.calaisSource = new CalaisSource(app, options.calaisApi, { minConfidence: 0.3, parseData: false });

        // Update on api call
        app.get('/api/newsfeatures', (req, res) => {
            this.alchemyFeed.getNewsText(options.keywords, 3, (data) => { this.processNews(data); });
            res.statusCode = 200;
            res.end();
        });
        // Update on api call with nr of items specified
        app.get('/api/newsfeatures/:numberofitems', (req, res) => {
            var n = req.params.numberofitems;
            if (n <= 0) {
                n = 1;
            } else if (n > 100) {
                n = 100;
            }
            n = Math.round(n);
            this.alchemyFeed.getNewsText(options.keywords, n, (data) => { this.processNews(data); });
            res.statusCode = 200;
            res.end();
        });

        // Update with interval
        setInterval(() => {
            this.alchemyFeed.getNewsText(options.keywords, 2, (data) => { this.processNews(data); });
        }, this.options.updateInterval * 1000);
    }

    /** Processes a data object containing news items */
    private processNews(data: Object) {
        console.log('Processing news...');
        var items = [];
        if (data && data.hasOwnProperty('docs')) {
            data['docs'].forEach((item) => {
                // Skip items that already exist
                if (fs.existsSync(path.join(this.options.newsFolder, item.id + '.json'))) return;
                items.push(item);
            });
            // Throttle the OpenCalais calls to 1Hz to prevent exceeding the limit
            setTimeout(() => this.contactCalais(items), 1000);
        } else {
            console.log('No docs found in result');
        }
    }

    /** Adds (geographic) information to news items using the OpenCalais source*/
    private contactCalais(items: any[]) {
        console.log('Contacting calais...');
        var item = items.shift();
        if (item && item.source && item.source.enriched && item.source.enriched.url) {
            this.calaisSource.getNewsFeatures(item.source.enriched.url.title + ' \n ' + item.source.enriched.url.text,
                ((fts: any[]) => {
                    console.log('Nr. items: ' + fts.length);
                    fts = fts.sort((a, b) => {
                        if (!a.properties.hasOwnProperty('relevance')) return -1;
                        if (!b.properties.hasOwnProperty('relevance')) return 1;
                        return (a.properties.relevance - b.properties.relevance);
                    });
                    if (fts.length === 0) fs.writeFileSync(path.join(this.options.newsFolder, item.id + '.json'), null);
                    fts.some((f) => {
                        if (f.geometry.coordinates.length > 0) {
                            f.properties['news_title'] = item.source.enriched.url.title;
                            f.properties['news_text'] = item.source.enriched.url.text;
                            f.properties['news_date'] = item.timestamp * 1000; //Timestamp is in seconds, convert to ms
                            f.properties['news_url'] = '[url=' + item.source.enriched.url.url + ']Source[/url]';
                            f.properties['news_author'] = item.source.enriched.url.author;
                            f.id = item.id;
                            f.type = 'Feature';
                            fs.writeFileSync(path.join(this.options.newsFolder, item.id + '.json'), JSON.stringify(f));
                            return true;
                        }
                        return false;
                    });
                }));
        }
        if (items.length === 0) {
            console.log('Calais queue empty');
            return;
        }
        setTimeout(() => this.contactCalais(items), 1000);
    }
}

// export class NYTimesFeed {
//     private apiKey;
//     private keywords: string[];

//     constructor(app: express.Express, apiKey: string) {
//         if (!apiKey || apiKey === '') {
//             console.log('Error: no api-key found for NYTimesFeed. Exiting...');
//             return;
//         }

//         this.apiKey = apiKey;

//         app.use(function(req, res, next) {
//             res.header('Access-Control-Allow-Origin', '*');
//             res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//             next();
//         });
//     }

//     public getNewsText(keywords: string | string[], clbk: Function): void {
//         var keys: string[];
//         if (typeof keywords === 'string') {
//             keys = [keywords];
//         } else if (Array.isArray(keywords)) {
//             keys = keywords;
//         } else {
//             console.log('Warning: no valid keyword(s)');
//             clbk(null, 'No valid keyword(s)');
//             return;
//         }
//         var url = ['http://api.nytimes.com/svc/search/v2/articlesearch.json?api-key=' + this.apiKey];
//         url.push('fq=headline:("' + keys.join('" "') + '") AND type_of_material:("News")');
//         url.push('begin_date=20140101');
//         url.push('sort=newest');
//         var urlString = url.join('&');
//         this.performRequest(urlString, (data, errText) => {
//             console.log('News request status: ' + urlString);
//             clbk(data, errText);
//         });
//     }

//     private performRequest(url: string, cb: Function) {
//         var options = {
//             uri: url,
//             method: 'GET',
//             body: null,
//             headers: {}
//         };

//         //Send the response
//         request(options, function(error, response, data) {
//             if (error) {
//                 return cb({}, error);
//             }

//             if (response === undefined) {
//                 return cb({}, 'Undefined NYtimes response');
//             } else if (response.statusCode === 200) {
//                 if (!data) {
//                     return cb({}, 'No data received');
//                 } else {
//                     try {
//                         var parsed = JSON.parse(data);
//                         if (parsed.hasOwnProperty('response')) {
//                             cb(parsed['response'], 'OK');
//                         } else {
//                             console.log(parsed);
//                             cb({}, 'No result received');
//                         }
//                     } catch (error) {
//                         cb({}, 'JSON parsing error');
//                     }
//                 }
//             } else {
//                 cb({}, 'Undefined response: ' + response.statusCode);
//             }
//         });
//     }
// }

export class AlchemyFeed {
    private apiKey;
    private keywords: string[];

    constructor(app: express.Express, apiKey: string) {
        if (!apiKey || apiKey === '') {
            console.log('Error: no api-key found for AlchemyFeed. Exiting...');
            return;
        }

        this.apiKey = apiKey;

        app.use(function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }

    public getNewsText(keywords: string | string[], count: number, clbk: Function): void {
        var keys: string[];
        if (typeof keywords === 'string') {
            keys = [keywords];
        } else if (Array.isArray(keywords)) {
            keys = keywords;
        } else {
            console.log('Warning: no valid keyword(s)');
            clbk(null, 'No valid keyword(s)');
            return;
        }
        if (typeof count !== 'number') count = 5;
        var url = ['https://gateway-a.watsonplatform.net/calls/data/GetNews?apikey=' + this.apiKey];
        url.push('outputMode=json');
        url.push('start=now-14d');
        url.push('end=now');
        url.push('count=' + count);
        url.push('q.enriched.url.enrichedTitle.keywords.keyword.text=O[' + keys.join('^') + ']');
        url.push('q.enriched.url.text=-[cookies]');
        url.push('return=enriched.url.url,enriched.url.title,enriched.url.text,enriched.url.author');
        var urlString = url.join('&');
        this.performRequest(urlString, (data, errText) => {
            console.log('News request status: ' + errText);
            clbk(data, errText);
        });
    }

    private performRequest(url: string, cb: Function) {
        var options = {
            uri: url,
            method: 'GET',
            body: null,
            headers: {}
        };

        //Send the response
        request(options, function(error, response, data) {
            if (error) {
                return cb({}, error);
            }

            if (response === undefined) {
                return cb({}, 'Undefined Alchemy response');
            } else if (response.statusCode === 200) {
                if (!data) {
                    return cb({}, 'No data received');
                } else {
                    try {
                        var parsed = JSON.parse(data);
                        if (parsed.hasOwnProperty('result')) {
                            cb(parsed['result'], 'OK');
                        } else {
                            console.log(parsed);
                            cb({}, 'No result received');
                        }
                    } catch (error) {
                        cb({}, 'JSON parsing error');
                    }
                }
            } else {
                cb({}, 'Undefined response: ' + response.statusCode);
            }
        });
    }
}

export class CalaisSource {
    private oc: calais.Calais;

    constructor(app: express.Express, apiKey: string, options?: calais.ICalaisOptions) {
        if (!apiKey || apiKey === '') {
            console.log('Error: no api-key found for OpenCalais. Exiting...');
            return;
        }

        app.use(function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        this.oc = new calais.Calais(apiKey, options);

        this.oc.set('content', '');
    }

    public getNewsFeatures(content: string, cb: Function): void {
        if (!content || content === '') {
            console.log('Error: no valid content.');
            cb([]);
        }

        this.oc.set('content', content);
        this.oc.extractFromText((result, err) => {
            if (err) {
                console.log('OpenCalais returned an error! : ' + err);
                cb([]);
            }

            var features = this.parseResult(result);
            cb(features);
        });
    }

    private parseResult(res: string | JSON): any[] {
        var features: any[] = [];
        var json = {};
        if (typeof res === 'string') {
            try {
                console.log('Parsing...');
                json = JSON.parse(res);
            } catch (error) {
                console.log('Error parsing string: ' + res);
                return;
            }
        } else if (typeof res !== 'object') {
            console.log('Unknown type: ' + typeof res);
            return;
        } else {
            json = res;
        }

        for (var key in json) {
            if (!json.hasOwnProperty(key)) continue;
            var item = json[key];
            if (!item.hasOwnProperty('_typeGroup') || !item.hasOwnProperty('name')) continue;
            var f;
            switch ((item['_typeGroup'])) {
                case 'entities':
                    f = this.parseEntity(item);
                    break;
                case 'relations':
                    f = this.parseRelation(item);
                    break;
                default:
                    break;
            }
            if (f) {
                features.push(f);
            }
        }
        return features;
    }

    private parseEntity(item: any) {
        var f = <IFeature>{ properties: {}, geometry: { type: 'Point', coordinates: [] }, sensors: null, id: item.id };
        if (item.hasOwnProperty('resolutions')) {
            var r = item['resolutions'].pop();
            if (r.hasOwnProperty('latitude') && r.hasOwnProperty('longitude')) {
                f.geometry.coordinates = [parseFloat(r['longitude']), parseFloat(r['latitude'])];
            }
            f.properties = r;
        }
        if (item.hasOwnProperty('name')) f.properties['Name'] = item['name'];
        if (item.hasOwnProperty('_type')) f.properties['Type'] = item['_type'];
        if (item.hasOwnProperty('relevance')) f.properties['Relevance'] = item['relevance'];
        return f;
    }

    private parseRelation(item: any) {
        var f = <IFeature>{};
        f.properties = {};
        f.properties['Name'] = item['name'];
        return f;
    }
}
