const Selector = require('../../../extension/scripts/Selector')
const utils = require('./../../utils')
const assert = require('chai').assert
const globals = require('../../globals')

describe('Element Attribute Selector', function () {
  var $el
  let $
  let document
  let window

  beforeEach(function () {
    $ = globals.$
    document = globals.document
    window = globals.window

    document.body.innerHTML = utils.getTestHTML()
    $el = utils.createElementFromHTML("<div id='tests' style='display:none'></div>", document)
    document.body.appendChild($el)
  })

  it('should extract image src tag', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorElementAttribute',
      multiple: false,
      extractAttribute: 'src',
      selector: 'img'
    }, { $, document, window })

    var dataDeferred = selector.getData(document.querySelector('#selector-image-one-image'))
    dataDeferred.then(function (data) {
      assert.deepEqual(data, [
        {
          'img': 'http://aa/'
        }
      ])
      done()
    })
  })

  it('should extract multiple src tags', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorElementAttribute',
      multiple: true,
      extractAttribute: 'src',
      selector: 'img'
    }, { $, document, window })

    var dataDeferred = selector.getData(document.querySelector('#selector-image-multiple-images'))

    dataDeferred.then(function (data) {
      assert.deepEqual(data, [
        {
          'img': 'http://aa/'
        },
        {
          'img': 'http://bb/'
        }
      ])
      done()
    })
  })

  it('should return only one data column', function () {
    var selector = new Selector({
      id: 'id',
      type: 'SelectorElementAttribute',
      multiple: true,
      selector: 'img'
    }, { $, document, window })

    var columns = selector.getDataColumns()
    assert.deepEqual(columns, [ 'id' ])
  })

  it('should return empty array when no images are found', function (done) {
    var selector = new Selector({
      id: 'img',
      type: 'SelectorElementAttribute',
      multiple: true,
      selector: 'img.not-exist',
      extractAttribute: 'src'
    }, { $, document, window })

    var dataDeferred = selector.getData(document.querySelector('#not-exist'))

    dataDeferred.then(function (data) {
      assert.deepEqual(data, [])
      done()
    })
  })

  it('should be able to select data- attributes', function (done) {
    var html = '<ul><li data-type="dog"></li></ul>'
    utils.appendHTML($el, html, document)

    var selector = new Selector({
      id: 'type',
      type: 'SelectorElementAttribute',
      multiple: true,
      selector: 'li',
      extractAttribute: 'data-type'
    }, { $, document, window })

    var dataDeferred = selector.getData($el)

    dataDeferred.then(function (data) {
      assert.deepEqual(data, [ {
        'type': 'dog'
      } ])
      done()
    })
  })
})
