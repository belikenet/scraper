import md5 = require("md5");
import * as S from "string";
import {Inject, Injector} from 'di-typescript';
import { Scraper } from "./scrape";
import { urlPayload } from "./webPageLauncher";

export module Utils {
    export function isFunction (f) : boolean {
        return typeof f === 'function';
    }

    export function isObject (o) : boolean{
        return typeof o === 'object';
    }

    export function funcify(f) {
        return this.isFunction(f) ? f : function() { return f; };
    }

    export function isArray(a) : boolean {
        return Array.isArray(a);
    }

    export function arrify<T>(a) : T[] {
        return this.isArray(a) ? a : a ? [a] : [];
    }

    export function getKeys(o) : string[] {
        var keys = [];
        for (var key in o) keys.push(key);
        return keys;
    }

    export function extend(obj) : any {
        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
            for (var prop in source) {
                try {
                    //recursively merge object properties
                    if ( source[prop].constructor==Object ) {
                        obj[prop] =this.extend(obj[prop], source[prop]);
                    } else {
                        if (source[prop] !== void 0) obj[prop] = source[prop];
                    }
                } catch(e) {
                    // Property in destination object not set; create it and set its value.
                    obj[prop] = source[prop];
                }
            }
        });
    }

    export function md5HashFunction (item: any){
        return md5(JSON.stringify(item));
    }

    export function idHashFunction (item: any) {
        return ('id' in item) ? item.id : md5HashFunction(item);
    }

    export function reflect(promise){
        return promise.then(function(v){ 
            return {data:v, status: "resolved" }
        },
                            function(e){ return {data:e, status: "rejected" }});
    }

    export function flatten (object) {
        return Object.assign( {}, ...function _flatten( objectBit, path = '' ) {  //spread the result into our return object
            return [].concat(                                                       //concat everything into one level
            ...Object.keys( objectBit ).map(                                      //iterate over object
                key => typeof objectBit[ key ] === 'object' && objectBit [ key ] !== null ?                       //check if there is a nested object
                _flatten( objectBit[ key ], `${ path.length ? path + "." : path }${ key }` ) :              //call itself if there is
                ( { [ `${ path.length ? path + "." : path }${ key }` ]: objectBit[ key ] } )                //append object with it’s path as key
            )
            )
        }( object ) );
    };

    export function binarify(items: any[], bins: number) : any[] {
        if (bins == 0 || items == null) return [];
        if (bins == 1) return [items];
        var data : any[] = [];

        for (var i = 0; i < bins; i++) data.push([]);

        for (var i = 0; i < items.length;) 
            for (var j = 0; j < bins && i < items.length; j++, i++) 
                data[j].push(items[i]);

        return data;
    }

}

export class Factories {
    private static _injector: any = new Injector(/*[{provide: IDataManager, useClass: EventsDataManager}]*/);
    constructor () {

    }

    static getScraper() {
        return this._injector.get(Scraper);
    }
}

export interface IDataManager {
    add(urlPayload: urlPayload, item: any | any[]);
    all(): any[];
}
