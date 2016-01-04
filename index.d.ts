import express = require('express');
import calais = require('calais-entity-extractor');
/** Options */
export declare class NewsSourceOptions {
    /** If true, set headers to enable CORRS. */
    corrs: boolean;
    /** source folder. If not set, uses ./newsfeatures */
    newsFolder: string;
    calaisApi: string;
    alchemyApi: string;
    keywords: string[];
    updateInterval: number;
}
export declare class NewsSource {
    private options;
    private alchemyFeed;
    private calaisSource;
    constructor(app: express.Express, options?: NewsSourceOptions);
    /** Processes a data object containing news items */
    private processNews(data);
    /** Adds (geographic) information to news items using the OpenCalais source*/
    private contactCalais(items);
}
export declare class AlchemyFeed {
    private apiKey;
    private keywords;
    constructor(app: express.Express, apiKey: string);
    getNewsText(keywords: string | string[], count: number, clbk: Function): void;
    private performRequest(url, cb);
}
export declare class CalaisSource {
    private oc;
    constructor(app: express.Express, apiKey: string, options?: calais.ICalaisOptions);
    getNewsFeatures(content: string, cb: Function): void;
    private parseResult(res);
    private parseEntity(item);
    private parseRelation(item);
}
