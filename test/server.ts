var express = require('express');
var path = require('path');
var serve = require('serve-static');

export class server {
    app: any;
    srv: any;
    constructor() {
        this.app = express();
        this.app.get("/empty", function(req, res){
            res.set('Content-Type', 'text/html')
            res.status(200);
            res.send("");
        });
        this.app.use(serve(path.resolve(__dirname, 'fixtures')));
    }

    listen(callback?) {
        this.srv = this.app.listen(7500, callback);
    }

    close(callback?) {
        if (this.srv)
            this.srv.close(callback);
    }
}