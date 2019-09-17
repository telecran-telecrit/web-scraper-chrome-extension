const Queue = require('./../../extension/scripts/Queue')
const assert = require('chai').assert

const Sitemap = require('./../../extension/scripts/Sitemap')
const FakeStore = require('./../FakeStore')
const Scraper = require('./../../extension/scripts/Scraper')
const Job = require('./../../extension/scripts/Job')
const utils = require('./../utils')
const globals = require('../globals')
const sinon = require('sinon')

describe('Scraper', function () {
  let q, store, $el
  let $
  let document
  let window
  let Browser
  const sandbox = sinon.createSandbox()
  beforeEach(function () {
    $ = globals.$
    document = globals.document
    window = globals.window
    Browser = globals.Browser

    q = new Queue()
    store = new FakeStore()
    document.body.innerHTML = utils.getTestHTML()
  })
  afterEach(function () {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild)
  })
  afterEach(function () {
    sandbox.restore()
  })

  it('Should handle error on job', function (done) {
    sandbox.stub(Job.prototype, 'execute')
      .callsFake(function (params, callback) {
        callback(new Error('Fake error test'))
      })

    const sitemap = new Sitemap({
      id: 'test',
      startUrl: 'http://test.lv/',
      selectors: [
        {
          'id': 'a',
          'selector': '#scraper-test-one-page a',
          'multiple': false,
          type: 'SelectorText',
          'parentSelectors': [
            '_root'
          ]
        }
      ]
    }, {$, document, window})

    let browser = new Browser({
      pageLoadDelay: 100
    })

    const s = new Scraper({
      queue: q,
      sitemap: sitemap,
      browser: browser,
      store: store
    }, {$, document, window})
    s.run(function (err) {
      if (err) {
        done()
      } else {
        done(new Error('Test should have failed')) 
      }
    })
  })


  it('should be able to scrape one page', function (done) {
    var sitemap = new Sitemap({
      id: 'test',
      startUrl: 'http://test.lv/',
      selectors: [
        {
          'id': 'a',
          'selector': '#scraper-test-one-page a',
          'multiple': false,
          type: 'SelectorText',
          'parentSelectors': [
            '_root'
          ]
        }
      ]
    }, {$, document, window})

    var browser = new Browser({
      pageLoadDelay: 100
    })

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      browser: browser,
      store: store
    }, {$, document, window})
    s.run(function () {
      assert.deepEqual(store.data[0], {a: 'a'})
      done()
    })
  })
  it('should be able to scrape a child page', function (done) {
    var sitemap = new Sitemap({
      id: 'test',
      startUrl: 'http://test.lv/',
      selectors: [
        {
          'id': 'link',
          'selector': '#scraper-test-child-page a',
          'multiple': true,
          type: 'SelectorLink',
          'parentSelectors': ['_root']
        },
        {
          'id': 'b',
          'selector': '#scraper-test-child-page b',
          'multiple': false,
          type: 'SelectorText',
          'parentSelectors': ['link']
        }
      ]
    }, {$, document, window})

    var browser = new Browser({
      pageLoadDelay: 500
    })

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      browser: browser,
      store: store,
      delay: 0
    }, {$, document, window})

    s.run(function () {
      assert.deepEqual(store.data, [
        {'link': 'test', 'link-href': 'http://test.lv/1/', 'b': 'b'}
      ])
      done()
    })
  })

  it('should be able to tell whether a data record can have child jobs', function () {
    var sitemap = new Sitemap({
      id: 'test',
      startUrl: 'http://test.lv/',
      selectors: [
        {
          'id': 'link-w-children',
          'selector': 'a',
          'multiple': true,
          type: 'SelectorLink',
          'parentSelectors': ['_root']
        },
        {
          'id': 'link-wo-children',
          'selector': 'a',
          'multiple': true,
          type: 'SelectorLink',
          'parentSelectors': ['_root']
        },
        {
          'id': 'b',
          'selector': '#scraper-test-child-page b',
          'multiple': false,
          type: 'SelectorText',
          'parentSelectors': ['link-w-children']
        }
      ]
    }, {$, document, window})

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      store: store
    }, {$, document, window})

    var follow = s.recordCanHaveChildJobs({
      _follow: 'http://example.com/',
      _followSelectorId: 'link-w-children'
    })
    assert.equal(follow, true)

    follow = s.recordCanHaveChildJobs({
      _follow: 'http://example.com/',
      _followSelectorId: 'link-wo-children'
    })
    assert.equal(follow, false)
  })

  it('should be able to create multiple start jobs', function () {
    var sitemap = new Sitemap({
      startUrl: 'http://test.lv/[1-100].html'
    }, {$, document, window})

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      store: store
    }, {$, document, window})

    s.initFirstJobs()
    assert.equal(q.jobs.length, 100)
  })

  it('should create multiple start jobs if multiple urls provided', function () {
    var sitemap = new Sitemap({
      startUrl: ['http://example.com/1', 'http://example.com/2', 'http://example.com/3']
    }, {$, document, window})

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      store: store
    }, {$, document, window})

    s.initFirstJobs()
    assert.equal(q.jobs.length, 3)
  })

  it('should extract filename from image url', function () {
    var image = Scraper.prototype.getFileFilename('http://example.com/image.jpg')
    assert.equal(image, 'image.jpg')
  })

  it('should extract filename from image url with query string', function () {
    var image = Scraper.prototype.getFileFilename('http://example.com/image.jpg?a=1&b=2')
    assert.equal(image, 'image.jpga=1&b=2')
  })

  it('should shorten image file name to 143 symbols', function () {
    // ext4 max is 254
    // ntfs max is 256
    // ecryptfs 143
    // web scraper allows only 130

    var image = Scraper.prototype.getFileFilename('http://example.com/012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789')
    assert.equal(image, '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789')
  })

  it('should extract filename from image url without http://', function () {
    var image = Scraper.prototype.getFileFilename('image.jpg')
    assert.equal(image, 'image.jpg')
  })
  // Not very clear what should jsdom do in this case
  it.skip('should store images', function (done) {
    var record = {
      '_imageBase64-test': 'test',
      '_imageMimeType-test': 'test',
      'test-src': 'http://images/image.png'
    }

    var browser = new Browser({
      pageLoadDelay: 500
    })

    var sitemap = new Sitemap({
      id: 'test'
    }, {$, document, window})

    var scraper = new Scraper({
      sitemap: sitemap,
      browser: browser
    }, {$, document, window})

    var deferredSave = scraper.saveImages(record)
    var downloadAPICalled = false
    chrome.downloads.onChanged.addListener(function () {
      downloadAPICalled = true
    })
    assert.equal(downloadAPICalled, false)

    deferredSave.then(function () {
      assert.equal(record['_imageBase64-test'], undefined)
      assert.equal(record['_imageMimeType-test'], undefined)
      assert.equal(downloadAPICalled, true)
      done()
    })
      .then(null, function (e) {
        done(e)
      })
  })

  it.skip('should store images while scraping', function (done) {
    $el.append('<div id="scraper-test-img"><img src="../docs/images/chrome-store-logo.png"></div>')

    var sitemap = new Sitemap({
      id: 'test',
      startUrl: 'http://test.com/',
      selectors: [
        {
          'id': 'test',
          'selector': '#scraper-test-img img',
          'multiple': true,
          type: 'SelectorImage',
          downloadImage: true,
          'parentSelectors': [
            '_root'
          ]
        }
      ]
    }, {$, document, window})

    var browser = new Browser({
      pageLoadDelay: 500
    })

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      browser: browser,
      store: store
    }, {$, document, window})

    var downloadAPICalled = false
    chrome.downloads.onChanged.addListener(function () {
      downloadAPICalled = true
    })

    s.run(function () {
      assert.ok(store.data[0]['test-src'].match(/chrome-store-logo.png/))
      assert.equal(downloadAPICalled, true)
      done()
    })
  })
})
