// test-setup.spec.js
import chai = require('chai')
const should = chai.should();
const sinon = require('sinon')  

beforeEach(function () {  
  this.sandbox = sinon.sandbox.create()
})

afterEach(function () {  
  this.sandbox.restore()
})