const getContentScript = require('../../../extension/scripts/getContentScript')
const selectorMatchers = require('../../Matchers')
const utils = require('../../utils')
const assert = require('chai').assert
const globals = require('../../globals')
describe('ContentScript', function () {
  var contentScript = getContentScript('ContentScript')
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

  it('should be able to extract html', async function () {
    $el.innerHTML = '<div id="content-script-html-selector-test"></div>'

    var deferredHMTL = contentScript.getHTML({
      CSSSelector: 'div#content-script-html-selector-test'
    }, { $, document, window })
    await selectorMatchers.deferredToEqual(deferredHMTL, '<div id="content-script-html-selector-test"></div>')
  })

  it('should be able to call ContentScript from background script', async function () {
    contentScript = getContentScript('BackgroundScript')

    $el.innerHTML = '<div id="content-script-html-selector-test"></div>'

    var deferredHMTL = contentScript.getHTML({
      CSSSelector: 'div#content-script-html-selector-test'
    }, { $, document, window })
    await selectorMatchers.deferredToEqual(deferredHMTL, '<div id="content-script-html-selector-test"></div>')
  })

  it('should be able to call ContentScript from devtools', async function () {
    contentScript = getContentScript('DevTools')

    $el.innerHTML = '<div id="content-script-html-selector-test"></div>'

    var deferredHMTL = contentScript.getHTML({
      CSSSelector: 'div#content-script-html-selector-test'
    }, { $, document, window })

    await selectorMatchers.deferredToEqual(deferredHMTL, '<div id="content-script-html-selector-test"></div>')
  })

  it('should be able to get css selector from user', async function () {
    contentScript = getContentScript('DevTools')
    $el.innerHTML = '<div id="content-script-css-selector-test"><a class="needed"></a><a></a></div>'

    var deferredCSSSelector = contentScript.selectSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      allowedElements: 'a'
    }, { $, document, window })

    // click on the element that will be selected
    $el.querySelector('a.needed').click()

    // finish selection
    document.body.querySelector('#-selector-toolbar .done-selecting-button').click()

    await selectorMatchers.deferredToEqual(deferredCSSSelector, { CSSSelector: 'a.needed' })

    assert.equal(window.cs, undefined)
  })

  it('should be return empty css selector when no element selected', async function () {
    contentScript = getContentScript('DevTools')
    $el.innerHTML = '<div id="content-script-css-selector-test"></div>'

    var deferredCSSSelector = contentScript.selectSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      allowedElements: 'a'
    }, { $, document, window })

    // finish selection
    document.body.querySelector('#-selector-toolbar .done-selecting-button').click()

    await selectorMatchers.deferredToEqual(deferredCSSSelector, { CSSSelector: '' })

    assert.equal(window.cs, undefined)
  })

  it('should be able to preview elements', async function () {
    contentScript = getContentScript('DevTools')
    $el.innerHTML = '<div id="content-script-css-selector-test"><a></a></div>'

    var deferredSelectorPreview = contentScript.previewSelector({
      parentCSSSelector: 'div#content-script-css-selector-test',
      elementCSSSelector: 'a'
    }, { $, document, window })

    assert.equal($('.-sitemap-select-item-selected').length, 1)
    assert.isTrue(document.querySelector('#content-script-css-selector-test').classList.contains('-sitemap-parent'))
    assert.isTrue($el.querySelector('a').classList.contains('-sitemap-select-item-selected'))

    var deferredSelectorPreviewCancel = contentScript.removeCurrentContentSelector()
    await selectorMatchers.deferredToEqual(deferredSelectorPreviewCancel, undefined)

    assert.equal(document.querySelectorAll('.-sitemap-select-item-selected').length, 0)
    assert.isFalse(document.querySelector('#content-script-css-selector-test').classList.contains('-sitemap-parent'))
    assert.equal($el.querySelector('a').classList.contains('-sitemap-select-item-selected'), false)

    assert.equal(window.cs, undefined)
  })
})
