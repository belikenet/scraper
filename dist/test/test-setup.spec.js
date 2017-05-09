// test-setup.spec.js
const sinon = require('sinon')  
const chai = require('chai')
const should = chai.should();

beforeEach(function () {  
  this.sandbox = sinon.sandbox.create()
})

afterEach(function () {  
  this.sandbox.restore()
})