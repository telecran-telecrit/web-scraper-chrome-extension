const ChromeHeadlessBrowser = require('./../../../extension/scripts/ChromeHeadlessBrowser')
const sinon = require('sinon')
const assert = require('chai').assert
const utils = require('./../../utils')
const Queue = require('./../../../extension/scripts/Queue')
const Sitemap = require('./../../../extension/scripts/Sitemap')
const FakeStore = require('./../../FakeStore')
const Scraper = require('./../../../extension/scripts/Scraper')

describe('Headless browser', function () {
  let sandbox
  beforeEach('Create sandbox', function () {
    sandbox = sinon.createSandbox()
  })
  afterEach('Release sandbox', function () {
    if (sandbox) sandbox.restore()
  })
  it('Scrape', function (done) {
    sandbox.stub(ChromeHeadlessBrowser.prototype, 'loadUrl').callsFake(async function () {
      const page = await this.pagePromise
      const html = utils.getTestHTML()
      await page.setContent(html)
    })

    const fake$ = {}
    const fakeDocument = {}
    const fakeWindow = {}
    const q = new Queue()
    const store = new FakeStore()

    const sitemap = new Sitemap({
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
    }, {$: fake$, document: fakeDocument, window: fakeWindow})

    var browser = new ChromeHeadlessBrowser({
      pageLoadDelay: 10
    })

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      browser: browser,
      store: store,
      delay: 0
    }, {$: fake$, document: fakeDocument, window: fakeWindow})

    s.run(function () {
      assert.deepEqual(store.data, [
        {'link': 'test', 'link-href': 'http://test.lv/1/', 'b': 'b'}
      ])
      done()
    })
  })

  it('Scraping is done in a different context', function (done) {
    sandbox.stub(ChromeHeadlessBrowser.prototype, 'loadUrl').callsFake(async function () {
      const page = await this.pagePromise
      const html = utils.getTestHTML()
      await page.setContent(html)
      await page.evaluate(function () {
        const blockedProperties = ['jquery', '$', 'jQuery']
        try {
          for (const property of blockedProperties) {
            Object.defineProperty(window, property, {
              get () {
                throw new Error('Wrong property: ' + property)
              },
              set () {
                throw new Error('Cannot set: ' + property)
              }
            })
          }
        } catch (e) {
          // This is executed once per visited page, so it can give problems
        }
      })
    })

    const fake$ = {}
    const fakeDocument = {}
    const fakeWindow = {}
    const q = new Queue()
    const store = new FakeStore()

    const sitemap = new Sitemap({
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
    }, {$: fake$, document: fakeDocument, window: fakeWindow})

    var browser = new ChromeHeadlessBrowser({
      pageLoadDelay: 10
    })

    var s = new Scraper({
      queue: q,
      sitemap: sitemap,
      browser: browser,
      store: store,
      delay: 0
    }, {$: fake$, document: fakeDocument, window: fakeWindow})

    s.run(function () {
      assert.deepEqual(store.data, [
        {'link': 'test', 'link-href': 'http://test.lv/1/', 'b': 'b'}
      ])
      done()
    })
  })
})
