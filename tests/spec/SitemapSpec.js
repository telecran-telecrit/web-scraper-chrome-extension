const assert = require('chai').assert
const Sitemap = require('../../extension/scripts/Sitemap')
const Selector = require('../../extension/scripts/Selector')
const SelectorList = require('../../extension/scripts/SelectorList')
const globals = require('../globals')

describe('Sitemap', function () {
  let $
  let document
  let window
  beforeEach(function () {
    $ = globals.$
    document = globals.document
    window = globals.window

  })
  it('should be able to rename selector with a parent', function () {
    var selectors = [
      {
        id: 'parent',
        type: 'SelectorElement',
        parentSelectors: [
          '_root'
        ]
      },
      {
        id: 'a',
        type: 'SelectorText',
        parentSelectors: [
          'parent'
        ]
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, { $, document, window })

    var expected = new Selector({
      id: 'b',
      type: 'SelectorText',
      parentSelectors: [
        'parent'
      ]
    }, { $, document, window })

    // no hard decidions here
    sitemap.updateSelector(sitemap.selectors[ 1 ], expected)
    assert.deepEqual(sitemap.selectors[ 1 ], expected)
  })

  it('should be able to rename selector with child selectors', function () {
    var selectors = [
      {
        id: 'child',
        type: 'SelectorText',
        parentSelectors: [
          'a'
        ]
      },
      {
        id: 'a',
        type: 'SelectorElement',
        parentSelectors: [
          '_root'
        ]
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, { $, document, window })

    var expected = new Selector({
      id: 'b',
      type: 'SelectorElement',
      parentSelectors: [
        '_root'
      ]
    }, { $, document, window })

    var expectedChild = new Selector({
      id: 'child',
      type: 'SelectorText',
      parentSelectors: [
        'b'
      ]
    }, { $, document, window })

    // no hard decidions here
    sitemap.updateSelector(sitemap.selectors[ 1 ], expected)
    assert.deepEqual(sitemap.selectors[ 1 ], expected)
    assert.deepEqual(sitemap.selectors[ 0 ], expectedChild)
  })

  it('should be able to rename selector who is his own parent', function () {
    var selectors = [
      {
        id: 'a',
        type: 'SelectorElement',
        parentSelectors: [
          'a'
        ]
      }
    ]

    var sitemap = new Sitemap({
      selectors: selectors
    }, { $, document, window })

    var update = new Selector({
      id: 'b',
      type: 'SelectorElement',
      parentSelectors: [
        'a'
      ]
    }, { $, document, window })

    var expected = new Selector({
      id: 'b',
      type: 'SelectorElement',
      parentSelectors: [
        'b'
      ]
    }, { $, document, window })

    // no hard decidions here
    sitemap.updateSelector(sitemap.selectors[ 0 ], update)
    assert.deepEqual(sitemap.selectors[ 0 ], expected)
  })

  it('should be able to change selector type', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorText',
          parentSelectors: [
            'a'
          ]
        }
      ]
    }, { $, document, window })

    var update = new Selector({
      id: 'a',
      type: 'SelectorLink',
      parentSelectors: [
        'a'
      ]
    }, { $, document, window })

    assert.isFalse(sitemap.selectors[ 0 ].canCreateNewJobs())
    sitemap.updateSelector(sitemap.selectors[ 0 ], update)
    assert.isTrue(sitemap.selectors[ 0 ].canCreateNewJobs())
  })

  it('should be able to export as JSON', function () {
    var sitemap = new Sitemap({
      _id: 'id',
      _rev: 'rev',
      selectors: [
        {
          id: 'a',
          type: 'SelectorElement',
          parentSelectors: [
            'a'
          ]
        }
      ]
    }, { $, document, window })

    var sitemapJSON = sitemap.exportSitemap()
    var expectedJSON = '{"_id":"id","selectors":[{"id":"a","type":"SelectorElement","parentSelectors":["a"]}]}'
    assert.equal(sitemapJSON, expectedJSON)
  })

  it('should be able to import from JSON', function () {
    var expectedSitemap = new Sitemap({
      _id: 'id',
      selectors: [
        {
          id: 'a',
          type: 'SelectorElement',
          parentSelectors: [
            'a'
          ]
        }
      ]
    }, { $, document, window })

    var sitemapJSON = '{"_id":"id","selectors":[{"id":"a","type":"SelectorElement","parentSelectors":["a"]}]}'
    var sitemap = new Sitemap(null, { $, document, window })
    sitemap.importSitemap(sitemapJSON)
    assert.deepEqual(sitemap, expectedSitemap)
  })

  it('should be able to export data as CSV', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorText',
          selector: 'div'
        },
        {
          id: 'b',
          type: 'SelectorText',
          selector: 'b'
        }
      ]
    }, { $, document, window })

    var data = [
      { a: 'a', b: 'b', c: 'c' }
    ]
    var blob = sitemap.getDataExportCsvBlob(data)
    // can't access the data so I'm just checking whether this runs
    assert.equal(blob.toString(), '[object Blob]')
  })

  it('should know what data columns is it going to return', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorText',
          selector: 'div'
        },
        {
          id: 'b',
          type: 'SelectorLink',
          selector: 'b'
        }
      ]
    }, { $, document, window })

    var columns = sitemap.getDataColumns()
    assert.deepEqual(columns, [ 'a', 'b', 'b-href' ])
  })

  it('should be able to delete a selector', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorText',
          selector: 'div',
          parentSelectors: [ '_root' ]
        },
        {
          id: 'b',
          type: 'SelectorLink',
          selector: 'b',
          parentSelectors: [ '_root' ]
        }
      ]
    }, { $, document, window })

    sitemap.deleteSelector(sitemap.selectors[ 0 ])

    assert.equal(sitemap.selectors.length, 1)
  })

  it('should be able to delete a selector with child selectors', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorText',
          selector: 'div',
          parentSelectors: [ '_root' ]
        },
        {
          id: 'b',
          type: 'SelectorLink',
          selector: 'b',
          parentSelectors: [ 'a' ]
        }
      ]
    }, { $, document, window })

    sitemap.deleteSelector(sitemap.selectors[ 0 ])
    assert.equal(sitemap.selectors.length, 0)
  })

  it('should not delete selectors if they have multiple parent selectors when deleting one of their parent', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorText',
          selector: 'div',
          parentSelectors: [ '_root' ]
        },
        {
          id: 'b',
          type: 'SelectorLink',
          selector: 'b',
          parentSelectors: [ 'a' ]
        },
        {
          id: 'c',
          type: 'SelectorLink',
          selector: 'c',
          parentSelectors: [ 'b', '_root' ]
        }
      ]
    }, { $, document, window })
    var expectedSelector = new Selector({
      id: 'c',
      type: 'SelectorLink',
      selector: 'c',
      parentSelectors: [ '_root' ]
    }, { $, document, window })

    sitemap.deleteSelector(sitemap.selectors[ 0 ])
    assert.deepEqual(sitemap.selectors, new SelectorList([ expectedSelector ], { $, document, window }))
  })

  it('Should return one start url', function () {
    var sitemap = new Sitemap({
      startUrl: 'http://example.com/'
    }, { $, document, window })
    var expectedURLS = [ 'http://example.com/' ]
    assert.deepEqual(sitemap.getStartUrls(), expectedURLS)
  })

  it('Should return multiple start urls', function () {
    var sitemap = new Sitemap({
      startUrl: 'http://example.com/[1-3].html'
    }, { $, document, window })
    var expectedURLS = [
      'http://example.com/1.html',
      'http://example.com/2.html',
      'http://example.com/3.html'
    ]
    assert.deepEqual(sitemap.getStartUrls(), expectedURLS)
  })

  it('Should return multiple start urls with id at the end', function () {
    var sitemap = new Sitemap({
      startUrl: 'http://example.com/?id=[1-3]'
    }, { $, document, window })
    var expectedURLS = [
      'http://example.com/?id=1',
      'http://example.com/?id=2',
      'http://example.com/?id=3'
    ]
    assert.deepEqual(sitemap.getStartUrls(), expectedURLS)
  })

  it('should return multiple start urls with specified incremental', function () {
    var sitemap = new Sitemap({
      startUrl: 'http://example.com/?id=[0-20:10]'
    }, { $, document, window })
    var expectedURLS = [
      'http://example.com/?id=0',
      'http://example.com/?id=10',
      'http://example.com/?id=20'
    ]
    assert.deepEqual(sitemap.getStartUrls(), expectedURLS)
  })

  it('Should return multiple start urls with padding', function () {
    var sitemap = new Sitemap({
      startUrl: 'http://example.com/[001-003].html'
    }, { $, document, window })
    var expectedURLS = [
      'http://example.com/001.html',
      'http://example.com/002.html',
      'http://example.com/003.html'
    ]
    assert.deepEqual(sitemap.getStartUrls(), expectedURLS)
  })

  it('Should return multiple start urls when startUrl is an array', function () {
    var sitemap = new Sitemap({
      startUrl: [ 'http://example.com/1.html', 'http://example.com/2.html', 'http://example.com/3.html' ]
    }, { $, document, window })
    var expectedURLS = [
      'http://example.com/1.html',
      'http://example.com/2.html',
      'http://example.com/3.html'
    ]
    assert.deepEqual(sitemap.getStartUrls(), expectedURLS)
  })

  it('Should return only selectors which can have child selectors', function () {
    var sitemap = new Sitemap({
      selectors: [
        {
          id: 'a',
          type: 'SelectorElement'
        },
        {
          id: 'b',
          type: 'SelectorGroup'
        },
        {
          id: 'c',
          type: 'SelectorHTML'
        },
        {
          id: 'd',
          type: 'SelectorImage'
        },
        {
          id: 'e',
          type: 'SelectorLink'
        },
        {
          id: 'f',
          type: 'SelectorText'
        }
      ]
    }, { $, document, window })

    var expectedIds = [ '_root', 'a', 'e' ]
    assert.deepEqual(sitemap.getPossibleParentSelectorIds(), expectedIds)
  })
})
