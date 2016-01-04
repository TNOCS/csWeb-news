declare module "calais-entity-extractor" {

    export interface ICalaisOptions {
        apiHost?: string;
        apiPath?: string;
        contentType?: string;
        language?: string;
        minConfidence?: number;
        parseData?: boolean;
    }

    export class Calais {
        constructor(apiKey: string, options?: ICalaisOptions);
        initialize(apiKey: string, options?: ICalaisOptions);

        /**
         * Perform the analysis request with Calais. If no |text| is given or |text| is empty,
         * then we fall back to the set options.content value. If that is also empty, an error is
         * returned.
         *
         * @param cb Callback function of form function(resultData, error);
         * @param text Optional, the text to perform extraction on. If not set, the options.content
         * value is used.
         * @returns nothing
         */
        extractFromText(cb: Function, text?: string);

        /**
         * Extract tags and entities from a given URL. We download the HTML from the URL, and submit
         * that to Calais using the extractFromText function
         *
         * @param url The URL to analyze.
         * @param cb The callback function, of form function(result, error)
         */
        extractFromUrl(url, cb);

        search(query, cb);

        set(key, value);

        validateOptions(): boolean;

        lookup(identifier, cb);
    }
}