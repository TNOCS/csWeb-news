import Winston = require('winston');
import http = require('http');
import path = require('path');
import fs = require('fs');
import express = require('express');
import News = require('../index');

// Read the configuration file that should contain API-keys and keywords
var config = require('../configuration.json');
var configurationOK = true;
if (!config || !config.hasOwnProperty('openCalaisApiKey') || !config.hasOwnProperty('alchemyFeedApiKey')
    || !config.hasOwnProperty('keywords')) {
    console.log('ERROR: Configuration file not valid. It should contain the keys: openCalaisApiKey, alchemyFeedApiKey, keywords');
    configurationOK = false;
}

Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.Console, <Winston.ConsoleTransportOptions>{
    colorize: true,
    label: 'csweb-news',
    prettyPrint: true
});

var newsLayerId = 'newsfeed';

var app = express();
app.set('port', 8888);
app.use(express.static(__dirname + '/public'));

//Create newsfeed if the required parameters are in the configuration file
if (configurationOK) {
    // Create news folder
    var newsFolder = path.join(__dirname, 'public', 'news');
    if (!fs.existsSync(newsFolder)) fs.mkdirSync(newsFolder);

    // Init news feed
    var opts = { corrs: true,
        newsFolder: newsFolder,
        alchemyApi: config.alchemyFeedApiKey,
        calaisApi: config.openCalaisApiKey,
        keywords: config.keywords,
        updateInterval: config.updateIntervalSeconds
    };
    var ns = new News.NewsSource(app, opts);
    console.log('News items will be placed in ' + newsFolder);
}

http.createServer(app).listen(app.get('port'), () => {
    console.log('Express server listening on port ' + app.get('port'));
});