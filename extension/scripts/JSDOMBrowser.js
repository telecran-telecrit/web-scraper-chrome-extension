const jsdom = require('jsdom')
const jQuery = require('jquery')
var jqueryDeferred = require('jquery-deferred')

const contentScraper = require('../content_script/content_scraper')
var whenCallSequentially = require('../assets/jquery.whencallsequentially')
const debug = require('debug')('web-scraper-headless:jsdom-browser')
var JSDOMBrowser = function (options) {
  this.pageLoadDelay = options.pageLoadDelay
}

JSDOMBrowser.prototype = {
  loadUrl: function (url, callback) {
    const {JSDOM} = jsdom
    const browser = this
    JSDOM.fromURL(url)
      .then(function (dom) {
        const window = dom.window
        const document = window.document
        const $ = jQuery(dom.window)
        setTimeout(function () {
          callback(null, {$, document, window})
        }, browser.pageLoadDelay)
      }).catch(e => callback(e))
  },
  close: function () {

  },
  saveImages: function (record, namingFunction) {
    var deferredResponse = jqueryDeferred.Deferred()
    var deferredImageStoreCalls = []
    var prefixLength = '_imageBase64-'.length
    for (var attr in record) {
      if (attr.substr(0, prefixLength) === '_imageBase64-') {
        throw new Error('Downloading images is not yet supported')
      }
    }
    whenCallSequentially(deferredImageStoreCalls).done(function () {
      deferredResponse.resolve()
    })

    return deferredResponse.promise()
  },
  fetchData: function (url, sitemap, parentSelectorId, callback, scope) {
    const browser = this
    debug('Init jsdom browser app')
    browser.loadUrl(url, function (err, options) {
      if (err) {
        return callback(err)
      }
      const {$, document, window} = options

      var message = {
        extractData: true,
        sitemap: JSON.parse(JSON.stringify(sitemap)),
        parentSelectorId: parentSelectorId
      }
      function sendResponse (data) {
        callback.call(scope, null, data)
      }
      contentScraper(message, null, sendResponse, {$, document, window})
    })
  }
}

module.exports = JSDOMBrowser
