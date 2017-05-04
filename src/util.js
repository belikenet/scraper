"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const md5 = require("md5");
const S = require("string");
var Utils;
(function (Utils) {
    function isFunction(f) {
        return typeof f === 'function';
    }
    Utils.isFunction = isFunction;
    function isObject(o) {
        return typeof o === 'object';
    }
    Utils.isObject = isObject;
    function funcify(f) {
        return this.isFunction(f) ? f : function () { return f; };
    }
    Utils.funcify = funcify;
    function isArray(a) {
        return Array.isArray(a);
    }
    Utils.isArray = isArray;
    function arrify(a) {
        return this.isArray(a) ? a : a ? [a] : [];
    }
    Utils.arrify = arrify;
    function getKeys(o) {
        var keys = [];
        for (var key in o)
            keys.push(key);
        return keys;
    }
    Utils.getKeys = getKeys;
    function extend(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function (source) {
            for (var prop in source) {
                try {
                    //recursively merge object properties
                    if (source[prop].constructor == Object) {
                        obj[prop] = this.extend(obj[prop], source[prop]);
                    }
                    else {
                        if (source[prop] !== void 0)
                            obj[prop] = source[prop];
                    }
                }
                catch (e) {
                    // Property in destination object not set; create it and set its value.
                    obj[prop] = source[prop];
                }
            }
        });
    }
    Utils.extend = extend;
    function md5HashFunction(item) {
        return md5(JSON.stringify(item));
    }
    Utils.md5HashFunction = md5HashFunction;
    function idHashFunction(item) {
        return ('id' in item) ? item.id : md5HashFunction(item);
    }
    Utils.idHashFunction = idHashFunction;
    function reflect(promise) {
        return promise.then(function (v) {
            return { data: v, status: "resolved" };
        }, function (e) { return { data: e, status: "rejected" }; });
    }
    Utils.reflect = reflect;
    function flatten(object) {
        return Object.assign({}, ...function _flatten(objectBit, path = '') {
            return [].concat(//concat everything into one level
            ...Object.keys(objectBit).map(//iterate over object
            key => typeof objectBit[key] === 'object' && objectBit[key] !== null ?
                _flatten(objectBit[key], `${path.length ? path + "." : path}${key}`) :
                ({ [`${path.length ? path + "." : path}${key}`]: objectBit[key] }) //append object with it’s path as key
            ));
        }(object));
    }
    Utils.flatten = flatten;
    ;
    function binarify(items, bins) {
        if (bins == 0 || items == null)
            return [];
        if (bins == 1)
            return [items];
        var data = [];
        for (var i = 0; i < bins; i++)
            data.push([]);
        for (var i = 0; i < items.length;)
            for (var j = 0; j < bins && i < items.length; j++, i++)
                data[j].push(items[i]);
        return data;
    }
    Utils.binarify = binarify;
})(Utils = exports.Utils || (exports.Utils = {}));
class UrlManager {
    /**
     *
     */
    constructor(config) {
        this.visitedUrls = [];
        this.config = config;
    }
    tryAddUrl(url) {
        if (S(url).isEmpty())
            return false;
        url = this.config.newHashNewPage ? url.split('#')[0] : url;
        var isValidUrl = (!(this.config.allowRepeatedUrls && url in this.visitedUrls));
        if (isValidUrl)
            this.visitedUrls.push(url);
        return isValidUrl;
    }
    addUrls(urls) {
        var _self = this;
        if (urls === null || urls === undefined)
            return urls;
        return urls.filter(function (u) { return _self.tryAddUrl(u); });
    }
}
exports.UrlManager = UrlManager;
//# sourceMappingURL=util.js.map