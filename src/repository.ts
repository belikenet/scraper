import * as S from "string";
import * as winston from "winston";


const Datastore = require('nedb'), 
      db = new Datastore({ filename: 'profiles\\profiles.db', autoload: true});

export class web {
    depth: number = 1;
    isLeaf: boolean = true;
    isVisited: boolean = false;
    isVisitedWithErrors: boolean = false;
    profile: string = ""; // domain
    notes: string | string[];
    timestamp: Date;
    fragments: string[];

    data: any;

    constructor() {}
}

export class Repository {

    getByProfile(profile) {
        return new Promise(function (resolve, reject) {
            db.find({profile: profile}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    getByProfileNonVisited (profile) {
        return new Promise(function (resolve, reject) {
            db.find({profile: profile, isVisited: false}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    getByProfileError (profile) {
        return new Promise(function (resolve, reject) {
            db.find({profile: profile, isVisitedWithErrors: true}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    getByProfileAndUrl(profile, url) {
        return new Promise(function (resolve, reject) {
            db.find({profile: profile, "data.url" : url }, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    removeByProfile(profile){
        return new Promise(function (resolve, reject) {
            db.remove({profile: profile}, {multi: true}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    upsert (items: web[]) {
        return new Promise(function (resolve, reject) {
            items.forEach(item => {
                db.update({profile: item.profile, "data.name" : item.data.name, "data.url" : item.data.url }, {item}, {upsert: true, returnUpdatedDocs: true, multi: true}, (error, count, docs) => {
                    if (error != null && error != undefined) return reject (error);
                    return resolve(docs);
                });
            });
        });
    }

    insert (items: web[]) {
        return new Promise(function (resolve, reject) {
            db.insert(items, (error, docs) => {
                if (error != null && error != undefined) return reject (error);
                return resolve(docs);
            });
        });
    }
}