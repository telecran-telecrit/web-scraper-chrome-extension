const Browser = require('./../../../extension/scripts/JSDOMBrowser')

it('Handle error in jsdom', function (done) {
  Browser.prototype.loadUrl = function (url, callback) {
    callback(new Error('Fake error'))
  }
  const jsdomBrowser = new Browser({})

  jsdomBrowser.fetchData('a', {}, {}, function (err) {
    if (err) {
      done()
    } else {
      done(new Error('It should have failed'))
    }
  })
})
