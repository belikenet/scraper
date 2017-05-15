"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-setup.spec.js
const chai = require("chai");
const should = chai.should();
const sinon = require('sinon');
beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
});
afterEach(function () {
    this.sandbox.restore();
});
//# sourceMappingURL=test-setup.spec.js.map