# csWeb-news
NPM package to get news articles based on certain keywords and save them as GeoJson-features, which provides the option to load them into csWeb.

It uses [AlchemyNews](http://www.alchemyapi.com) for obtaining news items (based on keywords), and [OpenCalais](http://www.opencalais.com) for converting news items into structured text, e.g. by adding additional information to news items (e.g. location). Both of these services require an API key, but do offer free services as well.

## Usage

For example, if you want to create a folder with news items, do the following.

* Download the zip file from [csWeb-example](https://github.com/TNOCS/csWeb-example) and unpack it in a new folder.
* Install all regular dependencies in this new project, install csweb-news package, and compile the source:
```
npm i
npm i csweb-news --s
cd public && bower i
cd ..
tsc -w -p .
```
* Add the news service to your server.ts file. When starting the server (```node server.js```), you should see a 
message on the console upon loading the file. 
```
cs.start(() => {
    var opts = { corrs: true,
          newsFolder: __directory + '/news',
          alchemyApi: config.alchemyFeedApiKey,
          calaisApi: config.openCalaisApiKey,
          keywords: config.keywords,
          updateInterval: config.updateIntervalSeconds
        };
    var ns = new csWebNews.NewsSource(cs.server, opts);
    console.log('started');
});
```
* Request an API key for [AlchemyNews](http://www.alchemyapi.com/api/register.html) and [OpenCalais](http://www.opencalais.com/opencalais-api/) and paste them in the configuration.json file.
* Place the topics that you are interested in, in the keywords parameter of the configuration.json.
e.g.
```
    {"openCalaisApiKey" : "xxxxx",
    "alchemyFeedApiKey" : "xxxxx",
    "keywords" : ["Soccer", "Premier League"],
    "updateIntervalSeconds" : 900}
...
```
The news items will be put in the ./news folder. More information of how to put these features on the map, can be found here: [csWeb-wiki](https://github.com/TNOCS/csWeb/wiki).
