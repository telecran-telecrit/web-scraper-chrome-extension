(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.contentScraper = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * @url http://jsperf.com/blob-base64-conversion
 * @type {{blobToBase64: blobToBase64, base64ToBlob: base64ToBlob}}
 */
var Base64 = {

  blobToBase64: function (blob) {
    var deferredResponse = jquery.Deferred();
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      deferredResponse.resolve(base64);
    };
    reader.readAsDataURL(blob);

    return deferredResponse.promise();
  },

  base64ToBlob: function (base64, mimeType) {
    var deferredResponse = jquery.Deferred();
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view], { type: mimeType });
    deferredResponse.resolve(blob);

    return deferredResponse.promise();
  }
};

module.exports = Base64;

},{"jquery-deferred":31}],2:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * @author Martins Balodis
 *
 * An alternative version of $.when which can be used to execute asynchronous
 * calls sequentially one after another.
 *
 * @returns jqueryDeferred().promise()
 */
module.exports = function whenCallSequentially(functionCalls) {
  var deferredResonse = jquery.Deferred();
  var resultData = [];

  // nothing to do
  if (functionCalls.length === 0) {
    return deferredResonse.resolve(resultData).promise();
  }

  var currentDeferred = functionCalls.shift()();
  // execute synchronous calls synchronously
  while (currentDeferred.state() === 'resolved') {
    currentDeferred.done(function (data) {
      resultData.push(data);
    });
    if (functionCalls.length === 0) {
      return deferredResonse.resolve(resultData).promise();
    }
    currentDeferred = functionCalls.shift()();
  }

  // handle async calls
  var interval = setInterval(function () {
    // handle mixed sync calls
    while (currentDeferred.state() === 'resolved') {
      currentDeferred.done(function (data) {
        resultData.push(data);
      });
      if (functionCalls.length === 0) {
        clearInterval(interval);
        deferredResonse.resolve(resultData);
        break;
      }
      currentDeferred = functionCalls.shift()();
    }
  }, 10);

  return deferredResonse.promise();
};

},{"jquery-deferred":31}],3:[function(require,module,exports){
var StoreDevtools = require('./StoreDevtools');
var SitemapController = require('./Controller');

$(function () {
  // init bootstrap alerts
  $('.alert').alert();

  var store = new StoreDevtools({ $, document, window });
  new SitemapController({
    store: store,
    templateDir: 'views/'
  }, { $, document, window });
});

},{"./Controller":7,"./StoreDevtools":25}],4:[function(require,module,exports){
var jquery = require('jquery-deferred');
const debug = require('debug')('web-scraper-headless:background-script');

/**
 * ContentScript that can be called from anywhere within the extension
 */
var BackgroundScript = {

  dummy: function () {
    return jquery.Deferred().resolve('dummy').promise();
  },

  /**
   * Returns the id of the tab that is visible to user
   * @returns jquery.Deferred() integer
   */
  getActiveTabId: function () {
    var deferredResponse = jquery.Deferred();

    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length < 1) {
        debug('There seems to be no active tab in the current window. Let us try only active');
        chrome.tabs.query({
          active: true,
          windowType: 'normal'
        }, function (tabs) {
          if (tabs.length < 1) {
            debug('Could not find tab');
            deferredResponse.reject("couldn't find the active tab");
          } else {
            const tabId = tabs[0].id;
            deferredResponse.resolve(tabId);
          }
        });
        // @TODO must be running within popup. maybe find another active window?
      } else {
        var tabId = tabs[0].id;
        deferredResponse.resolve(tabId);
      }
    });
    return deferredResponse.promise();
  },

  /**
   * Execute a function within the active tab within content script
   * @param request.fn	function to call
   * @param request.request	request that will be passed to the function
   */
  executeContentScript: function (request) {
    var reqToContentScript = {
      contentScriptCall: true,
      fn: request.fn,
      request: request.request
    };
    var deferredResponse = jquery.Deferred();
    var deferredActiveTabId = this.getActiveTabId();
    deferredActiveTabId.done(function (tabId) {
      chrome.tabs.sendMessage(tabId, reqToContentScript, function (response) {
        deferredResponse.resolve(response);
      });
    });

    return deferredResponse;
  }
};

module.exports = BackgroundScript;

},{"debug":29,"jquery-deferred":31}],5:[function(require,module,exports){
var ContentSelector = require('./ContentSelector');
var jquery = require('jquery-deferred');
const debug = require('debug')('web-scraper-headless:content-script');

/**
 * ContentScript that can be called from anywhere within the extension
 */
var ContentScript = {

  /**
   * Fetch
   * @param request.CSSSelector	css selector as string
   * @returns jquery.Deferred()
   */
  getHTML: function (request, options) {
    var $ = options.$;
    var deferredHTML = jquery.Deferred();
    var html = $(request.CSSSelector).clone().wrap('<p>').parent().html();
    deferredHTML.resolve(html);
    debug('Send html', html);
    return deferredHTML.promise();
  },

  /**
   * Removes current content selector if is in use within the page
   * @returns jquery.Deferred()
   */
  removeCurrentContentSelector: function () {
    var deferredResponse = jquery.Deferred();
    var contentSelector = window.cs;
    if (contentSelector === undefined) {
      deferredResponse.resolve();
    } else {
      contentSelector.removeGUI();
      window.cs = undefined;
      deferredResponse.resolve();
    }

    return deferredResponse.promise();
  },

  /**
   * Select elements within the page
   * @param request.parentCSSSelector
   * @param request.allowedElements
   */
  selectSelector: function (request, options) {
    var $ = options.$;
    var deferredResponse = jquery.Deferred();

    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector,
        allowedElements: request.allowedElements
      }, { $, document, window });
      window.cs = contentSelector;

      var deferredCSSSelector = contentSelector.getCSSSelector();
      deferredCSSSelector.done(function (response) {
        this.removeCurrentContentSelector().done(function () {
          deferredResponse.resolve(response);
          window.cs = undefined;
        });
      }.bind(this)).fail(function (message) {
        deferredResponse.reject(message);
        window.cs = undefined;
      });
    }.bind(this));

    return deferredResponse.promise();
  },

  /**
   * Preview elements
   * @param request.parentCSSSelector
   * @param request.elementCSSSelector
   */
  previewSelector: function (request, options) {
    var $ = options.$;
    var deferredResponse = jquery.Deferred();
    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector
      }, { $, document, window });
      window.cs = contentSelector;

      var deferredSelectorPreview = contentSelector.previewSelector(request.elementCSSSelector);
      deferredSelectorPreview.done(function () {
        deferredResponse.resolve();
      }).fail(function (message) {
        deferredResponse.reject(message);
        window.cs = undefined;
      });
    });
    return deferredResponse;
  }
};

module.exports = ContentScript;

},{"./ContentSelector":6,"debug":29,"jquery-deferred":31}],6:[function(require,module,exports){
var ElementQuery = require('./ElementQuery');
var jquery = require('jquery-deferred');

///var CssSelector = require('../../node_modules/css-selector/lib/CssSelector.js').CssSelector

if (typeof globalThis === 'undefined') {
		globalThis = function () {
				if (typeof self !== 'undefined') {
						return self;
				} else if (typeof window !== 'undefined') {
						return window;
				} else {
						return Function('return this')();
				}
		}();
}

if (!globalThis.CssSelector || !globalThis.ElementSelector) {
		globalThis.CssSelector = function CssSelector(options) {

				var me = this;

				// defaults
				this.ignoredTags = ['font', 'b', 'i', 's'];
				this.parent = document;
				this.ignoredClassBase = false;
				this.enableResultStripping = true;
				this.enableSmartTableSelector = false;
				this.ignoredClasses = [];
				this.query = function (selector) {
						return me.parent.querySelectorAll(selector);
				};

				// overrides defaults with options
				for (var i in options) {
						this[i] = options[i];
				}

				// jquery parent selector fix
				if (this.query === window.jQuery) {
						this.query = function (selector) {
								return jQuery(me.parent).find(selector);
						};
				}
		};

		// TODO refactor element selector list into a ~ class
		globalThis.ElementSelector = function ElementSelector(element, ignoredClasses) {

				this.element = element;
				this.isDirectChild = true;
				this.tag = element.localName;

				// nth-of-child(n+1)
				this.indexn = null;
				this.index = 1;
				if (element.parentNode !== undefined) {
						// nth-child
						//this.index = [].indexOf.call(element.parentNode.children, element)+1;

						// nth-of-type
						for (var i = 0; i < element.parentNode.children.length; i++) {
								var child = element.parentNode.children[i];
								if (child === element) {
										break;
								}
								if (child.tagName === element.tagName) {
										this.index++;
								}
						}
				}
				this.id = null;
				if (element.id !== '') {
						if (typeof element.id === 'string') {
								this.id = element.id;
						}
				}

				this.classes = new Array();
				for (var i = 0; i < element.classList.length; i++) {
						var cclass = element.classList[i];
						if (ignoredClasses.indexOf(cclass) === -1) {
								this.classes.push(cclass);
						}
				}
		};

		globalThis.ElementSelectorList = function ElementSelectorList(CssSelector) {
				this.CssSelector = CssSelector;
		};

		globalThis.ElementSelectorList.prototype = new Array();

		globalThis.ElementSelectorList.prototype.getCssSelector = function () {

				var resultSelectors = [];

				// TDD
				for (var i = 0; i < this.length; i++) {
						var selector = this[i];

						var isFirstSelector = i === this.length - 1;
						var resultSelector = selector.getCssSelector(isFirstSelector);

						if (this.CssSelector.enableSmartTableSelector) {
								if (selector.tag === 'tr') {
										if (selector.element.children.length === 2) {
												if (selector.element.children[0].tagName === 'TD' || selector.element.children[0].tagName === 'TH' || selector.element.children[0].tagName === 'TR') {

														var text = selector.element.children[0].textContent;
														text = text.trim();

														// escape quotes
														text.replace(/(\\*)(')/g, function (x) {
																var l = x.length;
																return l % 2 ? x : x.substring(0, l - 1) + "\\'";
														});
														resultSelector += ":contains('" + text + "')";
												}
										}
								}
						}

						resultSelectors.push(resultSelector);
				}

				var resultCSSSelector = resultSelectors.reverse().join(' ');
				return resultCSSSelector;
		};

		globalThis.ElementSelector.prototype = {

				getCssSelector: function (isFirstSelector) {

						if (isFirstSelector === undefined) {
								isFirstSelector = false;
						}

						var selector = this.tag;
						if (this.id !== null) {
								selector += '#' + this.id;
						}
						if (this.classes.length) {
								for (var i = 0; i < this.classes.length; i++) {
										selector += "." + this.classes[i];
								}
						}
						if (this.index !== null) {
								selector += ':nth-of-type(' + this.index + ')';
						}
						if (this.indexn !== null && this.indexn !== -1) {
								selector += ':nth-of-type(n+' + this.indexn + ')';
						}
						if (this.isDirectChild && isFirstSelector === false) {
								selector = "> " + selector;
						}

						return selector;
				},
				// merges this selector with another one.
				merge: function (mergeSelector) {

						if (this.tag !== mergeSelector.tag) {
								throw "different element selected (tag)";
						}

						if (this.index !== null) {
								if (this.index !== mergeSelector.index) {

										// use indexn only for two elements
										if (this.indexn === null) {
												var indexn = Math.min(mergeSelector.index, this.index);
												if (indexn > 1) {
														this.indexn = Math.min(mergeSelector.index, this.index);
												}
										} else {
												this.indexn = -1;
										}

										this.index = null;
								}
						}

						if (this.isDirectChild === true) {
								this.isDirectChild = mergeSelector.isDirectChild;
						}

						if (this.id !== null) {
								if (this.id !== mergeSelector.id) {
										this.id = null;
								}
						}

						if (this.classes.length !== 0) {
								var classes = new Array();

								for (var i in this.classes) {
										var cclass = this.classes[i];
										if (mergeSelector.classes.indexOf(cclass) !== -1) {
												classes.push(cclass);
										}
								}

								this.classes = classes;
						}
				}
		};

		globalThis.CssSelector.prototype = {
				mergeElementSelectors: function (newSelecors) {

						if (newSelecors.length < 1) {
								throw "No selectors specified";
						} else if (newSelecors.length === 1) {
								return newSelecors[0];
						}

						// check selector total count
						var elementCountInSelector = newSelecors[0].length;
						for (var i = 0; i < newSelecors.length; i++) {
								var selector = newSelecors[i];
								if (selector.length !== elementCountInSelector) {
										throw "Invalid element count in selector";
								}
						}

						// merge selectors
						var resultingElements = newSelecors[0];
						for (var i = 1; i < newSelecors.length; i++) {
								var mergeElements = newSelecors[i];

								for (var j = 0; j < elementCountInSelector; j++) {
										resultingElements[j].merge(mergeElements[j]);
								}
						}
						return resultingElements;
				},
				stripSelector: function (selectors) {

						var cssSeletor = selectors.getCssSelector();
						var baseSelectedElements = this.query(cssSeletor);

						var compareElements = function (elements) {
								if (baseSelectedElements.length !== elements.length) {
										return false;
								}

								for (var j = 0; j < baseSelectedElements.length; j++) {
										if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
												return false;
										}
								}
								return true;
						};
						// strip indexes
						for (var i = 0; i < selectors.length; i++) {
								var selector = selectors[i];
								if (selector.index !== null) {
										var index = selector.index;
										selector.index = null;
										var cssSeletor = selectors.getCssSelector();
										var newSelectedElements = this.query(cssSeletor);
										// if results doesn't match then undo changes
										if (!compareElements(newSelectedElements)) {
												selector.index = index;
										}
								}
						}

						// strip isDirectChild
						for (var i = 0; i < selectors.length; i++) {
								var selector = selectors[i];
								if (selector.isDirectChild === true) {
										selector.isDirectChild = false;
										var cssSeletor = selectors.getCssSelector();
										var newSelectedElements = this.query(cssSeletor);
										// if results doesn't match then undo changes
										if (!compareElements(newSelectedElements)) {
												selector.isDirectChild = true;
										}
								}
						}

						// strip ids
						for (var i = 0; i < selectors.length; i++) {
								var selector = selectors[i];
								if (selector.id !== null) {
										var id = selector.id;
										selector.id = null;
										var cssSeletor = selectors.getCssSelector();
										var newSelectedElements = this.query(cssSeletor);
										// if results doesn't match then undo changes
										if (!compareElements(newSelectedElements)) {
												selector.id = id;
										}
								}
						}

						// strip classes
						for (var i = 0; i < selectors.length; i++) {
								var selector = selectors[i];
								if (selector.classes.length !== 0) {
										for (var j = selector.classes.length - 1; j > 0; j--) {
												var cclass = selector.classes[j];
												selector.classes.splice(j, 1);
												var cssSeletor = selectors.getCssSelector();
												var newSelectedElements = this.query(cssSeletor);
												// if results doesn't match then undo changes
												if (!compareElements(newSelectedElements)) {
														selector.classes.splice(j, 0, cclass);
												}
										}
								}
						}

						// strip tags
						for (var i = selectors.length - 1; i > 0; i--) {
								var selector = selectors[i];
								selectors.splice(i, 1);
								var cssSeletor = selectors.getCssSelector();
								var newSelectedElements = this.query(cssSeletor);
								// if results doesn't match then undo changes
								if (!compareElements(newSelectedElements)) {
										selectors.splice(i, 0, selector);
								}
						}

						return selectors;
				},
				getElementSelectors: function (elements, top) {
						var elementSelectors = [];

						for (var i = 0; i < elements.length; i++) {
								var element = elements[i];
								var elementSelector = this.getElementSelector(element, top);
								elementSelectors.push(elementSelector);
						}

						return elementSelectors;
				},
				getElementSelector: function (element, top) {

						var elementSelectorList = new ElementSelectorList(this);
						while (true) {
								if (element === this.parent) {
										break;
								} else if (element === undefined || element.tagName === 'body' || element.tagName === 'BODY') {
										throw 'element is not a child of the given parent';
								}
								if (this.isIgnoredTag(element.tagName)) {

										element = element.parentNode;
										continue;
								}
								if (top > 0) {
										top--;
										element = element.parentNode;
										continue;
								}

								var selector = new ElementSelector(element, this.ignoredClasses);
								if (this.isIgnoredTag(element.parentNode.tagName)) {
										selector.isDirectChild = false;
								}

								elementSelectorList.push(selector);
								element = element.parentNode;
						}

						return elementSelectorList;
				},
				getCssSelector: function (elements, top) {

						top = top || 0;

						var enableSmartTableSelector = this.enableSmartTableSelector;
						if (elements.length > 1) {
								this.enableSmartTableSelector = false;
						}

						var elementSelectors = this.getElementSelectors(elements, top);
						var resultSelector = this.mergeElementSelectors(elementSelectors);
						if (this.enableResultStripping) {
								resultSelector = this.stripSelector(resultSelector);
						}

						this.enableSmartTableSelector = enableSmartTableSelector;

						// strip down selector
						return resultSelector.getCssSelector();
				},
				isIgnoredTag: function (tag) {
						return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
				}
		};
}

var CssSelector = globalThis.CssSelector;

const debug = require('debug')('web-scraper-headless:content-selector');
/**
 * @param options.parentCSSSelector	Elements can be only selected within this element
 * @param options.allowedElements	Elements that can only be selected
 * @constructor
 */
var ContentSelector = function (options, moreOptions) {
		// deferred response
		this.deferredCSSSelectorResponse = jquery.Deferred();

		this.allowedElements = options.allowedElements;
		this.parentCSSSelector = options.parentCSSSelector.trim();
		this.alert = options.alert || function (txt) {
				alert(txt);
		};

		this.$ = moreOptions.$;
		this.document = moreOptions.document;
		this.window = moreOptions.window;
		if (!this.$) throw new Error('Missing jquery in content selector');
		if (!this.document) throw new Error("Missing document");
		if (!this.window) throw new Error("Missing window");
		if (this.parentCSSSelector) {
				this.parent = this.$(this.parentCSSSelector)[0];

				//  handle situation when parent selector not found
				if (this.parent === undefined) {
						this.deferredCSSSelectorResponse.reject('parent selector not found');
						this.alert('Parent element not found!');
				}
		} else {
				this.parent = this.$('body')[0];
		}
};

ContentSelector.prototype = {

		/**
   * get css selector selected by the user
   */
		getCSSSelector: function (request) {
				if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
						// elements that are selected by the user
						this.selectedElements = [];
						// element selected from top
						this.top = 0;

						// initialize css selector
						this.initCssSelector(false);

						this.initGUI();
				}

				return this.deferredCSSSelectorResponse.promise();
		},

		getCurrentCSSSelector: function () {
				if (this.selectedElements && this.selectedElements.length > 0) {
						var cssSelector;

						// handle special case when parent is selected
						if (this.isParentSelected()) {
								if (this.selectedElements.length === 1) {
										cssSelector = '_parent_';
								} else if (this.$('#-selector-toolbar [name=diferentElementSelection]').prop('checked')) {
										var selectedElements = this.selectedElements.clone();
										selectedElements.splice(selectedElements.indexOf(this.parent), 1);
										cssSelector = '_parent_, ' + this.cssSelector.getCssSelector(selectedElements, this.top);
								} else {
										// will trigger error where multiple selections are not allowed
										cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top);
								}
						} else {
								cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top);
						}

						return cssSelector;
				}
				return '';
		},

		isParentSelected: function () {
				return this.selectedElements.indexOf(this.parent) !== -1;
		},

		/**
   * initialize or reconfigure css selector class
   * @param allowMultipleSelectors
   */
		initCssSelector: function (allowMultipleSelectors) {
				this.cssSelector = new CssSelector({
						enableSmartTableSelector: true,
						parent: this.parent,
						allowMultipleSelectors: allowMultipleSelectors,
						ignoredClasses: ['-sitemap-select-item-selected', '-sitemap-select-item-hover', '-sitemap-parent', '-web-scraper-img-on-top', '-web-scraper-selection-active'],
						query: this.$
				});
		},

		previewSelector: function (elementCSSSelector) {
				var $ = this.$;
				var document = this.document;
				var window = this.window;
				if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
						this.highlightParent();
						$(ElementQuery(elementCSSSelector, this.parent, { $, document, window })).addClass('-sitemap-select-item-selected');
						this.deferredCSSSelectorResponse.resolve();
				}

				return this.deferredCSSSelectorResponse.promise();
		},

		initGUI: function () {
				var document = this.document;
				this.highlightParent();

				// all elements except toolbar
				this.$allElements = this.$(this.allowedElements + ':not(#-selector-toolbar):not(#-selector-toolbar *)', this.parent);
				// allow selecting parent also
				if (this.parent !== document.body) {
						this.$allElements.push(this.parent);
				}

				this.bindElementHighlight();
				this.bindElementSelection();
				this.bindKeyboardSelectionManipulations();
				this.attachToolbar();
				this.bindMultipleGroupCheckbox();
				this.bindMultipleGroupPopupHide();
				this.bindMoveImagesToTop();
		},

		bindElementSelection: function () {
				this.$allElements.bind('click.elementSelector', function (e) {
						var element = e.currentTarget;
						if (this.selectedElements.indexOf(element) === -1) {
								this.selectedElements.push(element);
						}
						this.highlightSelectedElements();

						// Cancel all other events
						return false;
				}.bind(this));
		},

		/**
   * Add to select elements the element that is under the mouse
   */
		selectMouseOverElement: function () {
				var element = this.mouseOverElement;
				if (element) {
						this.selectedElements.push(element);
						this.highlightSelectedElements();
				}
		},

		bindElementHighlight: function () {
				var $ = this.$;
				$(this.$allElements).bind('mouseover.elementSelector', function (e) {
						var element = e.currentTarget;
						this.mouseOverElement = element;
						$(element).addClass('-sitemap-select-item-hover');
						return false;
				}.bind(this)).bind('mouseout.elementSelector', function (e) {
						var element = e.currentTarget;
						this.mouseOverElement = null;
						$(element).removeClass('-sitemap-select-item-hover');
						return false;
				}.bind(this));
		},

		bindMoveImagesToTop: function () {
				var $ = this.$;
				$('body').addClass('-web-scraper-selection-active');

				// do this only when selecting images
				if (this.allowedElements === 'img') {
						$('img').filter(function (i, element) {
								return $(element).css('position') === 'static';
						}).addClass('-web-scraper-img-on-top');
				}
		},

		unbindMoveImagesToTop: function () {
				this.$('body.-web-scraper-selection-active').removeClass('-web-scraper-selection-active');
				this.$('img.-web-scraper-img-on-top').removeClass('-web-scraper-img-on-top');
		},

		selectChild: function () {
				this.top--;
				if (this.top < 0) {
						this.top = 0;
				}
		},
		selectParent: function () {
				this.top++;
		},

		// User with keyboard arrows can select child or paret elements of selected elements.
		bindKeyboardSelectionManipulations: function () {
				var $ = this.$;
				var document = this.document;
				// check for focus
				var lastFocusStatus;
				this.keyPressFocusInterval = setInterval(function () {
						var focus = document.hasFocus();
						if (focus === lastFocusStatus) return;
						lastFocusStatus = focus;

						$('#-selector-toolbar .key-button').toggleClass('hide', !focus);
						$('#-selector-toolbar .key-events').toggleClass('hide', focus);
				}, 200);

				// Using up/down arrows user can select elements from top of the
				// selected element
				$(document).bind('keydown.selectionManipulation', function (event) {
						// select child C
						if (event.keyCode === 67) {
								this.animateClickedKey($('#-selector-toolbar .key-button-child'));
								this.selectChild();
						}
						// select parent P
						else if (event.keyCode === 80) {
										this.animateClickedKey($('#-selector-toolbar .key-button-parent'));
										this.selectParent();
								}
								// select element
								else if (event.keyCode === 83) {
												this.animateClickedKey($('#-selector-toolbar .key-button-select'));
												this.selectMouseOverElement();
										}

						this.highlightSelectedElements();
				}.bind(this));
		},

		animateClickedKey: function (element) {
				var $ = this.$;
				$(element).removeClass('clicked').removeClass('clicked-animation');
				setTimeout(function () {
						$(element).addClass('clicked');
						setTimeout(function () {
								$(element).addClass('clicked-animation');
						}, 100);
				}, 1);
		},

		highlightSelectedElements: function () {
				var $ = this.$;
				var document = this.document;
				var window = this.window;
				try {
						var resultCssSelector = this.getCurrentCSSSelector();

						$('body #-selector-toolbar .selector').text(resultCssSelector);
						// highlight selected elements
						$('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected');
						$(ElementQuery(resultCssSelector, this.parent, { $, document, window })).addClass('-sitemap-select-item-selected');
				} catch (err) {
						if (err === 'found multiple element groups, but allowMultipleSelectors disabled') {
								debug('multiple different element selection disabled');

								this.showMultipleGroupPopup();
								// remove last added element
								this.selectedElements.pop();
								this.highlightSelectedElements();
						}
				}
		},

		showMultipleGroupPopup: function () {
				this.$('#-selector-toolbar .popover').attr('style', 'display:block !important;');
		},

		hideMultipleGroupPopup: function () {
				this.$('#-selector-toolbar .popover').attr('style', '');
		},

		bindMultipleGroupPopupHide: function () {
				this.$('#-selector-toolbar .popover .close').click(this.hideMultipleGroupPopup.bind(this));
		},

		unbindMultipleGroupPopupHide: function () {
				this.$('#-selector-toolbar .popover .close').unbind('click');
		},

		bindMultipleGroupCheckbox: function () {
				var $ = this.$;
				$('#-selector-toolbar [name=diferentElementSelection]').change(function (e) {
						if ($(e.currentTarget).is(':checked')) {
								this.initCssSelector(true);
						} else {
								this.initCssSelector(false);
						}
				}.bind(this));
		},
		unbindMultipleGroupCheckbox: function () {
				this.$('#-selector-toolbar .diferentElementSelection').unbind('change');
		},

		attachToolbar: function () {
				var $ = this.$;
				var $toolbar = '<div id="-selector-toolbar">' + '<div class="list-item"><div class="selector-container"><div class="selector"></div></div></div>' + '<div class="input-group-addon list-item">' + '<input type="checkbox" title="Enable different type element selection" name="diferentElementSelection">' + '<div class="popover top">' + '<div class="close">×</div>' + '<div class="arrow"></div>' + '<div class="popover-content">' + '<div class="txt">' + 'Different type element selection is disabled. If the element ' + 'you clicked should also be included then enable this and ' + 'click on the element again. Usually this is not needed.' + '</div>' + '</div>' + '</div>' + '</div>' + '<div class="list-item key-events"><div title="Click here to enable key press events for selection">Enable key events</div></div>' + '<div class="list-item key-button key-button-select hide" title="Use S key to select element">S</div>' + '<div class="list-item key-button key-button-parent hide" title="Use P key to select parent">P</div>' + '<div class="list-item key-button key-button-child hide" title="Use C key to select child">C</div>' + '<div class="list-item done-selecting-button">Done selecting!</div>' + '</div>';
				$('body').append($toolbar);

				$('body #-selector-toolbar .done-selecting-button').click(function () {
						this.selectionFinished();
				}.bind(this));
		},
		highlightParent: function () {
				var $ = this.$;
				// do not highlight parent if its the body
				if (!$(this.parent).is('body') && !$(this.parent).is('#webpage')) {
						$(this.parent).addClass('-sitemap-parent');
				}
		},

		unbindElementSelection: function () {
				var $ = this.$;
				$(this.$allElements).unbind('click.elementSelector');
				// remove highlighted element classes
				this.unbindElementSelectionHighlight();
		},
		unbindElementSelectionHighlight: function () {
				this.$('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected');
				this.$('.-sitemap-parent').removeClass('-sitemap-parent');
		},
		unbindElementHighlight: function () {
				this.$(this.$allElements).unbind('mouseover.elementSelector').unbind('mouseout.elementSelector');
		},
		unbindKeyboardSelectionMaipulatios: function () {
				this.$(document).unbind('keydown.selectionManipulation');
				clearInterval(this.keyPressFocusInterval);
		},
		removeToolbar: function () {
				this.$('body #-selector-toolbar a').unbind('click');
				this.$('#-selector-toolbar').remove();
		},

		/**
   * Remove toolbar and unbind events
   */
		removeGUI: function () {
				this.unbindElementSelection();
				this.unbindElementHighlight();
				this.unbindKeyboardSelectionMaipulatios();
				this.unbindMultipleGroupPopupHide();
				this.unbindMultipleGroupCheckbox();
				this.unbindMoveImagesToTop();
				this.removeToolbar();
		},

		selectionFinished: function () {
				var resultCssSelector = this.getCurrentCSSSelector();

				this.deferredCSSSelectorResponse.resolve({
						CSSSelector: resultCssSelector
				});
		}
};

module.exports = ContentSelector;

},{"./ElementQuery":8,"debug":29,"jquery-deferred":31}],7:[function(require,module,exports){
var selectors = require('./Selectors');
var Selector = require('./Selector');
var SelectorTable = selectors.SelectorTable;
var SelectorGoogMapID = selectors.SelectorGoogMapID;
var Sitemap = require('./Sitemap');
// var SelectorGraphv2 = require('./SelectorGraphv2')
var getBackgroundScript = require('./getBackgroundScript');
var getContentScript = require('./getContentScript');
const debug = require('debug')('web-scraper-headless:controller');
var SitemapController = function (options, moreOptions) {
  this.$ = moreOptions.$;
  this.document = moreOptions.document;
  this.window = moreOptions.window;
  if (!this.$) throw new Error('Missing jquery in Controller');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  for (var i in options) {
    this[i] = options[i];
  }
  this.init();
};

SitemapController.prototype = {

  backgroundScript: getBackgroundScript('DevTools'),
  contentScript: getContentScript('DevTools'),

  control: function (controls) {
    var controller = this;

    for (var selector in controls) {
      for (var event in controls[selector]) {
        this.$(document).on(event, selector, function (selector, event) {
          return function () {
            var continueBubbling = controls[selector][event].call(controller, this);
            if (continueBubbling !== true) {
              return false;
            }
          };
        }(selector, event));
      }
    }
  },

  /**
   * Loads templates for ICanHaz
   */
  loadTemplates: function (cbAllTemplatesLoaded) {
    var templateIds = ['Viewport', 'SitemapList', 'SitemapListItem', 'SitemapCreate', 'SitemapStartUrlField', 'SitemapImport', 'SitemapExport', 'SitemapBrowseData', 'SitemapHeadlessScrapeConfig', 'SitemapScrapeConfig', 'SitemapExportDataCSV', 'SitemapEditMetadata', 'SelectorList', 'SelectorListItem', 'SelectorEdit', 'SelectorEditTableColumn',
    // 'SitemapSelectorGraph',
    'DataPreview'];
    var templatesLoaded = 0;
    var cbLoaded = function (templateId, template) {
      templatesLoaded++;
      ich.addTemplate(templateId, template);
      if (templatesLoaded === templateIds.length) {
        cbAllTemplatesLoaded();
      }
    };

    templateIds.forEach(function (templateId) {
      this.$.get(this.templateDir + templateId + '.html', cbLoaded.bind(this, templateId));
    }.bind(this));
  },

  init: function () {
    this.loadTemplates(function () {
      // currently viewed objects
      this.clearState();

      // render main viewport
      ich.Viewport().appendTo('body');

      // cancel all form submits
      this.$('form').bind('submit', function () {
        return false;
      });

      this.control({
        '#sitemaps-nav-button': {
          click: this.showSitemaps
        },
        '#create-sitemap-create-nav-button': {
          click: this.showCreateSitemap
        },
        '#create-sitemap-import-nav-button': {
          click: this.showImportSitemapPanel
        },
        '#sitemap-export-nav-button': {
          click: this.showSitemapExportPanel
        },
        '#sitemap-export-data-csv-nav-button': {
          click: this.showSitemapExportDataCsvPanel
        },
        '#submit-create-sitemap': {
          click: this.createSitemap
        },
        '#submit-import-sitemap': {
          click: this.importSitemap
        },
        '#sitemap-edit-metadata-nav-button': {
          click: this.editSitemapMetadata
        },
        '#sitemap-selector-list-nav-button': {
          click: this.showSitemapSelectorList
        }, /*,        '#sitemap-selector-graph-nav-button': {
           click: this.showSitemapSelectorGraph
           } */
        '#sitemap-browse-nav-button': {
          click: this.browseSitemapData
        },
        'button#submit-edit-sitemap': {
          click: this.editSitemapMetadataSave
        },
        '#edit-sitemap-metadata-form': {
          submit: function () {
            return false;
          }
        },
        '#sitemaps tr': {
          click: this.editSitemap
        },
        '#sitemaps button[action=delete-sitemap]': {
          click: this.deleteSitemap
        },
        '#sitemap-scrape-nav-button': {
          click: this.showScrapeSitemapConfigPanel

        },
        '#sitemap-headless-scrape-nav-button': {
          click: this.showHeadlessScrapeSitemapConfigPanel
        },
        '#submit-scrape-sitemap-form': {
          submit: function () {
            return false;
          }
        },
        '#submit-scrape-sitemap': {
          click: this.scrapeSitemap
        },
        '#submit-headless-scrape-sitemap': {
          click: this.headlessScrapeSitemap
        },
        '#sitemaps button[action=browse-sitemap-data]': {
          click: this.sitemapListBrowseSitemapData
        },
        '#sitemaps button[action=csv-download-sitemap-data]': {
          click: this.downloadSitemapData
        },
        // @TODO move to tr
        '#selector-tree tbody tr': {
          click: this.showChildSelectors
        },
        '#selector-tree .breadcrumb a': {
          click: this.treeNavigationshowSitemapSelectorList
        },
        '#selector-tree tr button[action=edit-selector]': {
          click: this.editSelector
        },
        '#edit-selector select[name=type]': {
          change: this.selectorTypeChanged
        },
        '#edit-selector button[action=save-selector]': {
          click: this.saveSelector
        },
        '#edit-selector button[action=cancel-selector-editing]': {
          click: this.cancelSelectorEditing
        },
        '#edit-selector #selectorId': {
          keyup: this.updateSelectorParentListOnIdChange
        },
        '#selector-tree button[action=add-selector]': {
          click: this.addSelector
        },
        '#selector-tree tr button[action=delete-selector]': {
          click: this.deleteSelector
        },
        '#selector-tree tr button[action=preview-selector]': {
          click: this.previewSelectorFromSelectorTree
        },
        '#selector-tree tr button[action=data-preview-selector]': {
          click: this.previewSelectorDataFromSelectorTree
        },
        '#edit-selector button[action=select-selector]': {
          click: this.selectSelector
        },
        '#edit-selector button[action=select-table-header-row-selector]': {
          click: this.selectTableHeaderRowSelector
        },
        '#edit-selector button[action=select-table-data-row-selector]': {
          click: this.selectTableDataRowSelector
        },
        '#edit-selector button[action=preview-selector]': {
          click: this.previewSelector
        },
        '#edit-selector button[action=preview-click-element-selector]': {
          click: this.previewClickElementSelector
        },
        '#edit-selector button[action=preview-table-row-selector]': {
          click: this.previewTableRowSelector
        },
        '#edit-selector button[action=preview-selector-data]': {
          click: this.previewSelectorDataFromSelectorEditing
        },
        'button.add-extra-start-url': {
          click: this.addStartUrl
        },
        'button.remove-start-url': {
          click: this.removeStartUrl
        }
      });
      this.showSitemaps();
    }.bind(this));
  },

  clearState: function () {
    this.state = {
      // sitemap that is currently open
      currentSitemap: null,
      // selector ids that are shown in the navigation
      editSitemapBreadcumbsSelectors: null,
      currentParentSelectorId: null,
      currentSelector: null
    };
  },

  setStateEditSitemap: function (sitemap) {
    this.state.currentSitemap = sitemap;
    this.state.editSitemapBreadcumbsSelectors = [{ id: '_root' }];
    this.state.currentParentSelectorId = '_root';
  },

  setActiveNavigationButton: function (navigationId) {
    this.$('.nav .active').removeClass('active');
    this.$('#' + navigationId + '-nav-button').closest('li').addClass('active');

    if (navigationId.match(/^sitemap-/)) {
      this.$('#sitemap-nav-button').removeClass('disabled');
      this.$('#sitemap-nav-button').closest('li').addClass('active');
      this.$('#navbar-active-sitemap-id').text('(' + this.state.currentSitemap._id + ')');
    } else {
      this.$('#sitemap-nav-button').addClass('disabled');
      this.$('#navbar-active-sitemap-id').text('');
    }

    if (navigationId.match(/^create-sitemap-/)) {
      this.$('#create-sitemap-nav-button').closest('li').addClass('active');
    }
  },

  /**
   * Simple info popup for sitemap start url input field
   */
  initMultipleStartUrlHelper: function () {
    this.$('#startUrl').popover({
      title: 'Multiple start urls',
      html: true,
      content: 'You can create ranged start urls like this:<br />http://example.com/[1-100].html',
      placement: 'bottom'
    }).blur(function () {
      this.$(this).popover('hide');
    });
  },

  /**
   * Returns bootstrapValidator object for current form in viewport
   */
  getFormValidator: function () {
    var validator = this.$('#viewport form').data('bootstrapValidator');
    return validator;
  },

  /**
   * Returns whether current form in the viewport is valid
   * @returns {Boolean}
   */
  isValidForm: function () {
    var validator = this.getFormValidator();

    // validator.validate();
    // validate method calls submit which is not needed in this case.
    for (var field in validator.options.fields) {
      validator.validateField(field);
    }

    var valid = validator.isValid();
    return valid;
  },

  /**
   * Add validation to sitemap creation or editing form
   */
  initSitemapValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        '_id': {
          validators: {
            notEmpty: {
              message: 'The sitemap id is required and cannot be empty'
            },
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[a-z][a-z0-9_$()+\-/]+$/,
              message: 'Only lowercase characters (a-z), digits (0-9), or any of the characters _, $, (, ), +, -, and / are allowed. Must begin with a letter.'
            },
            // placeholder for sitemap id existance validation
            callback: {
              message: 'Sitemap with this id already exists',
              callback: function (value, validator) {
                return true;
              }
            }
          }
        },
        'startUrl[]': {
          validators: {
            notEmpty: {
              message: 'The start URL is required and cannot be empty'
            },
            uri: {
              message: 'The start URL is not a valid URL'
            }
          }
        }
      }
    });
  },

  showCreateSitemap: function () {
    this.setActiveNavigationButton('create-sitemap-create');
    var sitemapForm = ich.SitemapCreate();
    this.$('#viewport').html(sitemapForm);
    this.initMultipleStartUrlHelper();
    this.initSitemapValidation();

    return true;
  },

  initImportStiemapValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        '_id': {
          validators: {
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[a-z][a-z0-9_$()+\-/]+$/,
              message: 'Only lowercase characters (a-z), digits (0-9), or any of the characters _, $, (, ), +, -, and / are allowed. Must begin with a letter.'
            },
            // placeholder for sitemap id existance validation
            callback: {
              message: 'Sitemap with this id already exists',
              callback: function (value, validator) {
                return true;
              }
            }
          }
        },
        sitemapJSON: {
          validators: {
            notEmpty: {
              message: 'Sitemap JSON is required and cannot be empty'
            },
            callback: {
              message: 'JSON is not valid',
              callback: function (value, validator) {
                try {
                  JSON.parse(value);
                } catch (e) {
                  return false;
                }
                return true;
              }
            }
          }
        }
      }
    });
  },

  showImportSitemapPanel: function () {
    this.setActiveNavigationButton('create-sitemap-import');
    var sitemapForm = ich.SitemapImport();
    this.$('#viewport').html(sitemapForm);
    this.initImportStiemapValidation();
    return true;
  },

  showSitemapExportPanel: function () {
    this.setActiveNavigationButton('sitemap-export');
    var sitemap = this.state.currentSitemap;
    var sitemapJSON = sitemap.exportSitemap();
    var sitemapExportForm = ich.SitemapExport({
      sitemapJSON: sitemapJSON
    });
    this.$('#viewport').html(sitemapExportForm);
    return true;
  },

  showSitemaps: function () {
    this.clearState();
    this.setActiveNavigationButton('sitemaps');

    this.store.getAllSitemaps(function (sitemaps) {
      var $sitemapListPanel = ich.SitemapList();
      sitemaps.forEach(function (sitemap) {
        var $sitemap = ich.SitemapListItem(sitemap);
        $sitemap.data('sitemap', sitemap);
        $sitemapListPanel.find('tbody').append($sitemap);
      });
      this.$('#viewport').html($sitemapListPanel);
    });
  },

  getSitemapFromMetadataForm: function () {
    var id = this.$('#viewport form input[name=_id]').val();
    var $startUrlInputs = this.$('#viewport form .input-start-url');
    var startUrl;
    if ($startUrlInputs.length === 1) {
      startUrl = $startUrlInputs.val();
    } else {
      startUrl = [];
      $startUrlInputs.each(function (i, element) {
        startUrl.push(this.$(element).val());
      });
    }

    return {
      id: id,
      startUrl: startUrl
    };
  },

  createSitemap: function (form) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    var sitemapData = this.getSitemapFromMetadataForm();

    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
      } else {
        var sitemap = new Sitemap({
          _id: sitemapData.id,
          startUrl: sitemapData.startUrl,
          selectors: []
        }, { $, document, window });
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root']);
        }.bind(this, sitemap));
      }
    }.bind(this));
  },

  importSitemap: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // load data from form
    var sitemapJSON = this.$('[name=sitemapJSON]').val();
    var id = this.$('input[name=_id]').val();
    var sitemap = new Sitemap(null, { $, document, window });
    sitemap.importSitemap(sitemapJSON);
    if (id.length) {
      sitemap._id = id;
    }
    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemap._id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
      } else {
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root']);
        }.bind(this, sitemap));
      }
    }.bind(this));
  },

  editSitemapMetadata: function (button) {
    this.setActiveNavigationButton('sitemap-edit-metadata');

    var sitemap = this.state.currentSitemap;
    var $sitemapMetadataForm = ich.SitemapEditMetadata(sitemap);
    this.$('#viewport').html($sitemapMetadataForm);
    this.initMultipleStartUrlHelper();
    this.initSitemapValidation();

    return true;
  },

  editSitemapMetadataSave: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var sitemap = this.state.currentSitemap;
    var sitemapData = this.getSitemapFromMetadataForm();

    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemap._id !== sitemapData.id && sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
        return;
      }

      // change data
      sitemap.startUrl = sitemapData.startUrl;

      // just change sitemaps url
      if (sitemapData.id === sitemap._id) {
        this.store.saveSitemap(sitemap, function (sitemap) {
          this.showSitemapSelectorList();
        }.bind(this));
      } else {
        // id changed. we need to delete the old one and create a new one
        var newSitemap = new Sitemap(sitemap, { $, document, window });
        var oldSitemap = sitemap;
        newSitemap._id = sitemapData.id;
        this.store.createSitemap(newSitemap, function (newSitemap) {
          this.store.deleteSitemap(oldSitemap, function () {
            this.state.currentSitemap = newSitemap;
            this.showSitemapSelectorList();
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  },

  /**
   * Callback when sitemap edit button is clicked in sitemap grid
   */
  editSitemap: function (tr) {
    var sitemap = this.$(tr).data('sitemap');
    this._editSitemap(sitemap);
  },
  _editSitemap: function (sitemap) {
    this.setStateEditSitemap(sitemap);
    this.setActiveNavigationButton('sitemap');

    this.showSitemapSelectorList();
  },
  showSitemapSelectorList: function () {
    this.setActiveNavigationButton('sitemap-selector-list');

    var sitemap = this.state.currentSitemap;
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    var parentSelectorId = this.state.currentParentSelectorId;

    var $selectorListPanel = ich.SelectorList({
      parentSelectors: parentSelectors
    });
    var selectors = sitemap.getDirectChildSelectors(parentSelectorId);
    selectors.forEach(function (selector) {
      var $selector = ich.SelectorListItem(selector);
      $selector.data('selector', selector);
      $selectorListPanel.find('tbody').append($selector);
    });
    this.$('#viewport').html($selectorListPanel);

    return true;
  }, /*
     showSitemapSelectorGraph: function () {
     this.setActiveNavigationButton('sitemap-selector-graph')
     var sitemap = this.state.currentSitemap
     var $selectorGraphPanel = ich.SitemapSelectorGraph()
     $('#viewport').html($selectorGraphPanel)
     var graphDiv = $('#selector-graph')[0]
     var graph = new SelectorGraphv2(sitemap)
     graph.draw(graphDiv, $(document).width(), 200)
     return true
     }, */
  showChildSelectors: function (tr) {
    var selector = this.$(tr).data('selector');
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    this.state.currentParentSelectorId = selector.id;
    parentSelectors.push(selector);

    this.showSitemapSelectorList();
  },

  treeNavigationshowSitemapSelectorList: function (button) {
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    var controller = this;
    this.$('#selector-tree .breadcrumb li a').each(function (i, parentSelectorButton) {
      if (parentSelectorButton === button) {
        parentSelectors.splice(i + 1);
        controller.state.currentParentSelectorId = parentSelectors[i].id;
      }
    });
    this.showSitemapSelectorList();
  },

  initSelectorValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'id': {
          validators: {
            notEmpty: {
              message: 'Sitemap id required and cannot be empty'
            },
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[^_].*$/,
              message: 'Selector id cannot start with an underscore _'
            }
          }
        },
        selector: {
          validators: {
            notEmpty: {
              message: 'Selector is required and cannot be empty'
            }
          }
        },
        regex: {
          validators: {
            callback: {
              message: 'JavaScript does not support regular expressions that can match 0 characters.',
              callback: function (value, validator) {
                // allow no regex
                if (!value) {
                  return true;
                }

                var matches = ''.match(new RegExp(value));
                if (matches !== null && matches[0] === '') {
                  return false;
                } else {
                  return true;
                }
              }
            }
          }
        },
        clickElementSelector: {
          validators: {
            notEmpty: {
              message: 'Click selector is required and cannot be empty'
            }
          }
        },
        tableHeaderRowSelector: {
          validators: {
            notEmpty: {
              message: 'Header row selector is required and cannot be empty'
            }
          }
        },
        tableDataRowSelector: {
          validators: {
            notEmpty: {
              message: 'Data row selector is required and cannot be empty'
            }
          }
        },
        delay: {
          validators: {
            numeric: {
              message: 'Delay must be numeric'
            }
          }
        },
        parentSelectors: {
          validators: {
            notEmpty: {
              message: 'You must choose at least one parent selector'
            },
            callback: {
              message: 'Cannot handle recursive element selectors',
              callback: function (value, validator, $field) {
                var sitemap = this.getCurrentlyEditedSelectorSitemap();
                return !sitemap.selectors.hasRecursiveElementSelectors();
              }.bind(this)
            }
          }
        }
      }
    });
  },
  editSelector: function (button) {
    var selector = this.$(button).closest('tr').data('selector');
    this._editSelector(selector);
  },
  updateSelectorParentListOnIdChange: function () {
    var selector = this.getCurrentlyEditedSelector();
    this.$('.currently-edited').val(selector.id).text(selector.id);
  },
  _editSelector: function (selector) {
    var sitemap = this.state.currentSitemap;
    var selectorIds = sitemap.getPossibleParentSelectorIds();

    var $editSelectorForm = ich.SelectorEdit({
      selector: selector,
      selectorIds: selectorIds,
      selectorTypes: [{
        type: 'SelectorText',
        title: 'Text'
      }, {
        type: 'SelectorLink',
        title: 'Link'
      }, {
        type: 'SelectorPopupLink',
        title: 'Popup Link'
      }, {
        type: 'SelectorImage',
        title: 'Image'
      }, {
        type: 'SelectorTable',
        title: 'Table'
      }, {
        type: 'SelectorGoogMapID',
        title: 'GoogMaps'
      }, {
        type: 'SelectorElementAttribute',
        title: 'Element attribute'
      }, {
        type: 'SelectorHTML',
        title: 'HTML'
      }, {
        type: 'SelectorElement',
        title: 'Element'
      }, {
        type: 'SelectorElementScroll',
        title: 'Element scroll down'
      }, {
        type: 'SelectorElementClick',
        title: 'Element click'
      }, {
        type: 'SelectorGroup',
        title: 'Grouped'
      }]
    });
    this.$('#viewport').html($editSelectorForm);
    // mark initially opened selector as currently edited
    var self = this;
    this.$('#edit-selector #parentSelectors option').each(function (i, element) {
      if (self.$(element).val() === selector.id) {
        self.$(element).addClass('currently-edited');
      }
    });

    // set clickType
    if (selector.clickType) {
      $editSelectorForm.find('[name=clickType]').val(selector.clickType);
    }
    // set clickElementUniquenessType
    if (selector.clickElementUniquenessType) {
      $editSelectorForm.find('[name=clickElementUniquenessType]').val(selector.clickElementUniquenessType);
    }

    // handle selects seperately
    $editSelectorForm.find('[name=type]').val(selector.type);
    selector.parentSelectors.forEach(function (parentSelectorId) {
      $editSelectorForm.find("#parentSelectors [value='" + parentSelectorId + "']").attr('selected', 'selected');
    });

    this.state.currentSelector = selector;
    this.selectorTypeChanged();
    this.initSelectorValidation();
  },
  selectorTypeChanged: function () {
    var type = this.$('#edit-selector select[name=type]').val();
    var features = selectors[type].getFeatures();
    this.$('#edit-selector .feature').hide();
    var self = this;
    features.forEach(function (feature) {
      self.$('#edit-selector .feature-' + feature).show();
    });

    // add this selector to possible parent selector
    var selector = this.getCurrentlyEditedSelector();
    if (selector.canHaveChildSelectors()) {
      if (this.$('#edit-selector #parentSelectors .currently-edited').length === 0) {
        var $option = this.$('<option class="currently-edited"></option>');
        $option.text(selector.id).val(selector.id);
        this.$('#edit-selector #parentSelectors').append($option);
      }
    } else {
      // remove if type doesn't allow to have child selectors
      this.$('#edit-selector #parentSelectors .currently-edited').remove();
    }
  },
  saveSelector: function (button) {
    var sitemap = this.state.currentSitemap;
    var selector = this.state.currentSelector;
    var newSelector = this.getCurrentlyEditedSelector();

    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // cancel possible element selection
    this.contentScript.removeCurrentContentSelector().then(function () {
      sitemap.updateSelector(selector, newSelector);

      this.store.saveSitemap(sitemap, function () {
        this.showSitemapSelectorList();
      }.bind(this));
    }.bind(this));
  },
  /**
   * Get selector from selector editing form
   */
  getCurrentlyEditedSelector: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var id = $('#edit-selector [name=id]').val();
    var selectorsSelector = $('#edit-selector [name=selector]').val();
    var tableDataRowSelector = $('#edit-selector [name=tableDataRowSelector]').val();
    var mapsSelectorFromDiv = $('#edit-selector [name=mapsSelectorFromDiv]').val();
    var tableHeaderRowSelector = $('#edit-selector [name=tableHeaderRowSelector]').val();
    var clickElementSelector = $('#edit-selector [name=clickElementSelector]').val();
    var type = $('#edit-selector [name=type]').val();
    var clickElementUniquenessType = $('#edit-selector [name=clickElementUniquenessType]').val();
    var clickType = $('#edit-selector [name=clickType]').val();
    var discardInitialElements = $('#edit-selector [name=discardInitialElements]').is(':checked');
    var multiple = $('#edit-selector [name=multiple]').is(':checked');
    var downloadImage = $('#edit-selector [name=downloadImage]').is(':checked');
    var clickPopup = $('#edit-selector [name=clickPopup]').is(':checked');
    var regex = $('#edit-selector [name=regex]').val();
    var delay = $('#edit-selector [name=delay]').val();
    var extractAttribute = $('#edit-selector [name=extractAttribute]').val();
    var parentSelectors = $('#edit-selector [name=parentSelectors]').val();
    var columns = [];
    var $columnHeaders = $('#edit-selector .column-header');
    var $columnNames = $('#edit-selector .column-name');
    var $columnExtracts = $('#edit-selector .column-extract');

    $columnHeaders.each(function (i) {
      var header = $($columnHeaders[i]).val();
      var name = $($columnNames[i]).val();
      var extract = $($columnExtracts[i]).is(':checked');
      columns.push({
        header: header,
        name: name,
        extract: extract
      });
    });

    var newSelector = new Selector({
      id: id,
      selector: selectorsSelector,
      tableHeaderRowSelector: tableHeaderRowSelector,
      tableDataRowSelector: tableDataRowSelector,
      mapsSelectorFromDiv: mapsSelectorFromDiv,
      clickElementSelector: clickElementSelector,
      clickElementUniquenessType: clickElementUniquenessType,
      clickType: clickType,
      discardInitialElements: discardInitialElements,
      type: type,
      multiple: multiple,
      downloadImage: downloadImage,
      clickPopup: clickPopup,
      regex: regex,
      extractAttribute: extractAttribute,
      parentSelectors: parentSelectors,
      columns: columns,
      delay: delay
    }, {
      $, document, window
    });
    return newSelector;
  },
  /**
   * @returns {Sitemap|*} Cloned Sitemap with currently edited selector
   */
  getCurrentlyEditedSelectorSitemap: function () {
    var sitemap = this.state.currentSitemap.clone();
    var selector = sitemap.getSelectorById(this.state.currentSelector.id);
    var newSelector = this.getCurrentlyEditedSelector();
    sitemap.updateSelector(selector, newSelector);
    return sitemap;
  },
  cancelSelectorEditing: function (button) {
    // cancel possible element selection
    this.contentScript.removeCurrentContentSelector().then(function () {
      this.showSitemapSelectorList();
    }.bind(this));
  },
  addSelector: function () {
    var parentSelectorId = this.state.currentParentSelectorId;
    var sitemap = this.state.currentSitemap;

    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var selector = new Selector({
      parentSelectors: [parentSelectorId],
      type: 'SelectorText',
      multiple: false
    }, { $, window, document });

    this._editSelector(selector, sitemap);
  },
  deleteSelector: function (button) {
    var sitemap = this.state.currentSitemap;
    var selector = this.$(button).closest('tr').data('selector');
    sitemap.deleteSelector(selector);

    this.store.saveSitemap(sitemap, function () {
      this.showSitemapSelectorList();
    }.bind(this));
  },
  deleteSitemap: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap');
    var controller = this;
    this.store.deleteSitemap(sitemap, function () {
      controller.showSitemaps();
    });
  },
  initScrapeSitemapConfigValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'requestInterval': {
          validators: {
            notEmpty: {
              message: 'The request interval is required and cannot be empty'
            },
            numeric: {
              message: 'The request interval must be numeric'
            },
            callback: {
              message: 'The request interval must be atleast 2000 milliseconds',
              callback: function (value, validator) {
                return value >= 2000;
              }
            }
          }
        },
        'pageLoadDelay': {
          validators: {
            notEmpty: {
              message: 'The page load delay is required and cannot be empty'
            },
            numeric: {
              message: 'The page laod delay must be numeric'
            },
            callback: {
              message: 'The page load delay must be atleast 500 milliseconds',
              callback: function (value, validator) {
                return value >= 500;
              }
            }
          }
        }
      }
    });
  },
  initHeadlessScrapeSitemapConfigValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'requestInterval': {
          validators: {
            notEmpty: {
              message: 'The request interval is required and cannot be empty'
            },
            numeric: {
              message: 'The request interval must be numeric'
            },
            callback: {
              message: 'The request interval must be atleast 2000 milliseconds',
              callback: function (value, validator) {
                return value >= 2000;
              }
            }
          }
        },
        'pageLoadDelay': {
          validators: {
            notEmpty: {
              message: 'The page load delay is required and cannot be empty'
            },
            numeric: {
              message: 'The page laod delay must be numeric'
            },
            callback: {
              message: 'The page load delay must be atleast 500 milliseconds',
              callback: function (value, validator) {
                return value >= 500;
              }
            }
          }
        }
      }
    });
  },
  showScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-scrape');
    var scrapeConfigPanel = ich.SitemapScrapeConfig();
    this.$('#viewport').html(scrapeConfigPanel);
    this.initScrapeSitemapConfigValidation();
    return true;
  },
  showHeadlessScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-headless-scrape');
    var scrapeConfigPanel = ich.SitemapHeadlessScrapeConfig();
    this.$('#viewport').html(scrapeConfigPanel);
    this.initHeadlessScrapeSitemapConfigValidation();
    return true;
  },
  scrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false;
    }

    var requestInterval = this.$('input[name=requestInterval]').val();
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val();

    var sitemap = this.state.currentSitemap;
    var request = {
      scrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay

      // show sitemap scraping panel
    };this.getFormValidator().destroy();
    this.$('.scraping-in-progress').removeClass('hide');
    this.$('#submit-scrape-sitemap').closest('.form-group').hide();
    this.$('#scrape-sitemap-config input').prop('disabled', true);

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData();
    }.bind(this));
    return false;
  },
  headlessScrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false;
    }

    var requestInterval = this.$('input[name=requestInterval]').val();
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val();

    var sitemap = this.state.currentSitemap;
    var request = {
      headlessScrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay

      // show sitemap scraping panel
    };this.getFormValidator().destroy();
    this.$('.scraping-in-progress').removeClass('hide');
    this.$('#submit-scrape-sitemap').closest('.form-group').hide();
    this.$('#scrape-sitemap-config input').prop('disabled', true);

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData();
    }.bind(this));
    return false;
  },
  sitemapListBrowseSitemapData: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap');
    this.setStateEditSitemap(sitemap);
    this.browseSitemapData();
  },
  browseSitemapData: function () {
    this.setActiveNavigationButton('sitemap-browse');
    var sitemap = this.state.currentSitemap;
    this.store.getSitemapData(sitemap, function (data) {
      var dataColumns = sitemap.getDataColumns();

      var dataPanel = ich.SitemapBrowseData({
        columns: dataColumns
      });
      this.$('#viewport').html(dataPanel);

      // display data
      // Doing this the long way so there aren't xss vulnerubilites
      // while working with data or with the selector titles
      var $tbody = this.$('#sitemap-data tbody');
      var self = this;
      data.forEach(function (row) {
        var $tr = self.$('<tr></tr>');
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>');
          var cellData = row[column];
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData);
          }
          $td.text(cellData);
          $tr.append($td);
        });
        $tbody.append($tr);
      });
    });

    return true;
  },

  showSitemapExportDataCsvPanel: function () {
    this.setActiveNavigationButton('sitemap-export-data-csv');

    var sitemap = this.state.currentSitemap;
    var exportPanel = ich.SitemapExportDataCSV(sitemap);
    this.$('#viewport').html(exportPanel);

    // generate data
    this.$('.download-button').hide();
    this.store.getSitemapData(sitemap, function (data) {
      var blob = sitemap.getDataExportCsvBlob(data);
      this.$('.download-button a').attr('href', window.URL.createObjectURL(blob));
      this.$('.download-button a').attr('download', sitemap._id + '.csv');
      this.$('.download-button').show();
    });

    return true;
  },

  selectSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = $(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: selector.getItemCSSSelector()
    }, { $, document, window });

    deferredSelector.done(function (result) {
      if (result === null) {
        console.error('C:\\Users\\User\\Solutions\\web-scraper-chrome_geoblink\\extension\\scripts\\Controller.js:1190:22:\'Result was returned null. Maybe there was a communication loss with content script. Try to close and open the dev tools\'', 'Result was returned null. Maybe there was a communication loss with content script. Try to close and open the dev tools');
      }
      $(input).val(result.CSSSelector);

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);

      // @TODO how could this be encapsulated?
      // update header row, data row selectors after selecting the table. selectors are updated based on tables
      // inner html
      if (selector.type === 'SelectorTable') {
        this.getSelectorHTML().done(function (html) {
          var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html, { $, document, window });
          var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html, { $, document, window });
          $('input[name=tableHeaderRowSelector]').val(tableHeaderRowSelector);
          $('input[name=tableDataRowSelector]').val(tableDataRowSelector);

          var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, { $, document, window });
          this.renderTableHeaderColumns(headerColumns);
        }.bind(this));
      }

      if (selector.type === 'SelectorGoogMapID') {
        this.getSelectorHTML().done(function (html) {
          var mapSelectorFromDiv = SelectorGoogMapID.getMapsSelectorFromDivHTML(html, { $, document, window });
          $('input[name=mapsSelectorFromDiv]').val(mapSelectorFromDiv);
        });
      }
    }.bind(this));
  },

  getCurrentStateParentSelectorIds: function () {
    var parentSelectorIds = this.state.editSitemapBreadcumbsSelectors.map(function (selector) {
      return selector.id;
    });

    return parentSelectorIds;
  },

  selectTableHeaderRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = $(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, { $, document, window });

    deferredSelector.done(function (result) {
      var tableHeaderRowSelector = result.CSSSelector;
      $(input).val(tableHeaderRowSelector);

      this.getSelectorHTML().done(function (html) {
        var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, { $, document, window });
        this.renderTableHeaderColumns(headerColumns);
      }.bind(this));

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);
    }.bind(this));
  },

  selectTableDataRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = this.$(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, { $, document, window });

    var self = this;
    deferredSelector.done(function (result) {
      if (!result) return console.error('C:\\Users\\User\\Solutions\\web-scraper-chrome_geoblink\\extension\\scripts\\Controller.js:1277:40:new Error(\'result should not be null\')', new Error('result should not be null'));
      self.$(input).val(result.CSSSelector);

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);
    }.bind(this));
  },

  /**
   * update table selector column editing fields
   */
  renderTableHeaderColumns: function (headerColumns) {
    // reset previous columns
    var $tbody = this.$('.feature-columns table tbody');
    $tbody.html('');
    headerColumns.forEach(function (column) {
      var $row = ich.SelectorEditTableColumn(column);
      $tbody.append($row);
    });
  },

  /**
   * Returns HTML that the current selector would select
   */
  getSelectorHTML: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var CSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);
    var deferredHTML = this.contentScript.getHTML({ CSSSelector: CSSSelector }, { $, document, window });

    return deferredHTML;
  },
  previewSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap();
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewClickElementSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap;
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.clickElementSelector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewTableRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap();
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);
      var rowSelector = $(button).closest('.form-group').find('input').val();

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: rowSelector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewSelectorFromSelectorTree: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap;
      var selector = $(button).closest('tr').data('selector');
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewSelectorDataFromSelectorTree: function (button) {
    var self = this;
    var sitemap = this.state.currentSitemap;
    var selector = self.$(button).closest('tr').data('selector');
    this.previewSelectorData(sitemap, selector.id);
  },
  previewSelectorDataFromSelectorEditing: function () {
    var sitemap = this.state.currentSitemap.clone();
    var selector = sitemap.getSelectorById(this.state.currentSelector.id);
    var newSelector = this.getCurrentlyEditedSelector();
    sitemap.updateSelector(selector, newSelector);
    this.previewSelectorData(sitemap, newSelector.id);
  },
  /**
   * Returns a list of selector ids that the user has opened
   * @returns {Array}
   */
  getStateParentSelectorIds: function () {
    var parentSelectorIds = [];
    this.state.editSitemapBreadcumbsSelectors.forEach(function (selector) {
      parentSelectorIds.push(selector.id);
    });
    return parentSelectorIds;
  },
  previewSelectorData: function (sitemap, selectorId) {
    // data preview will be base on how the selector tree is opened
    var parentSelectorIds = this.getStateParentSelectorIds();

    var self = this;

    var request = {
      previewSelectorData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      parentSelectorIds: parentSelectorIds,
      selectorId: selectorId
    };
    chrome.runtime.sendMessage(request, function (response) {
      if (response.length === 0) {
        return;
      }
      var dataColumns = Object.keys(response[0]);

      debug(dataColumns);

      var $dataPreviewPanel = ich.DataPreview({
        columns: dataColumns
      });
      self.$('#viewport').append($dataPreviewPanel);
      $dataPreviewPanel.modal('show');
      // display data
      // Doing this the long way so there aren't xss vulnerubilites
      // while working with data or with the selector titles
      var $tbody = self.$('tbody', $dataPreviewPanel);
      response.forEach(function (row) {
        var $tr = self.$('<tr></tr>');
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>');
          var cellData = row[column];
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData);
          }
          $td.text(cellData);
          $tr.append($td);
        });
        $tbody.append($tr);
      });

      var windowHeight = self.$(window).height();

      self.$('.data-preview-modal .modal-body').height(windowHeight - 130);

      // remove modal from dom after it is closed
      $dataPreviewPanel.on('hidden.bs.modal', function () {
        self.$(this).remove();
      });
    });
  },
  /**
   * Add start url to sitemap creation or editing form
   * @param button
   */
  addStartUrl: function (button) {
    var self = this;
    var $startUrlInputField = ich.SitemapStartUrlField();
    self.$('#viewport .start-url-block:last').after($startUrlInputField);
    var validator = this.getFormValidator();
    validator.addField($startUrlInputField.find('input'));
  },
  /**
   * Remove start url from sitemap creation or editing form.
   * @param button
   */
  removeStartUrl: function (button) {
    var self = this;
    var $block = self.$(button).closest('.start-url-block');
    if (self.$('#viewport .start-url-block').length > 1) {
      // remove from validator
      var validator = this.getFormValidator();
      validator.removeField($block.find('input'));

      $block.remove();
    }
  }
};

module.exports = SitemapController;

},{"./Selector":9,"./Selectors":23,"./Sitemap":24,"./getBackgroundScript":27,"./getContentScript":28,"debug":29}],8:[function(require,module,exports){
/**
 * Element selector. Uses jQuery as base and adds some more features
 * @param CSSSelector
 * @param parentElement
 * @param options
 */
var ElementQuery = function (CSSSelector, parentElement, options) {
  CSSSelector = CSSSelector || '';
  this.$ = options.$;
  this.document = options.document;
  this.window = options.window;
  if (!this.$) throw new Error('Missing jquery for ElementQuery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  var selectedElements = [];

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element);
    }
  };

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector);
  var self = this;
  selectorParts.forEach(function (selector) {
    // handle special case when parent is selected
    if (selector === '_parent_') {
      self.$(parentElement).each(function (i, element) {
        addElement(element);
      });
    } else {
      var elements = self.$(selector, self.$(parentElement));
      elements.each(function (i, element) {
        addElement(element);
      });
    }
  });

  return selectedElements;
};

ElementQuery.getSelectorParts = function (CSSSelector) {
  var selectors = CSSSelector.split(/(,|".*?"|'.*?'|\(.*?\))/);

  var resultSelectors = [];
  var currentSelector = '';
  selectors.forEach(function (selector) {
    if (selector === ',') {
      if (currentSelector.trim().length) {
        resultSelectors.push(currentSelector.trim());
      }
      currentSelector = '';
    } else {
      currentSelector += selector;
    }
  });
  if (currentSelector.trim().length) {
    resultSelectors.push(currentSelector.trim());
  }

  return resultSelectors;
};

module.exports = ElementQuery;

},{}],9:[function(require,module,exports){
var selectors = require('./Selectors');
var ElementQuery = require('./ElementQuery');
var jquery = require('jquery-deferred');
const debug = require('debug')('web-scraper-headless:selector');

var Selector = function (selector, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");

  this.updateData(selector);
  this.initType();
};

Selector.prototype = {

  /**
   * Is this selector configured to return multiple items?
   * @returns {boolean}
   */
  willReturnMultipleRecords: function () {
    return this.canReturnMultipleRecords() && this.multiple;
  },

  /**
   * Update current selector configuration
   * @param data
   */
  updateData: function (data) {
    var allowedKeys = ['window', 'document', 'id', 'type', 'selector', 'parentSelectors'];
    debug('data type', data.type);
    allowedKeys = allowedKeys.concat(selectors[data.type].getFeatures());
    var key;
    // update data
    for (key in data) {
      if (allowedKeys.indexOf(key) !== -1 || typeof data[key] === 'function') {
        this[key] = data[key];
      }
    }

    // remove values that are not needed for this type of selector
    for (key in this) {
      if (allowedKeys.indexOf(key) === -1 && typeof this[key] !== 'function') {
        delete this[key];
      }
    }
  },

  /**
   * CSS selector which will be used for element selection
   * @returns {string}
   */
  getItemCSSSelector: function () {
    return '*';
  },

  /**
   * override objects methods based on seletor type
   */
  initType: function () {
    if (selectors[this.type] === undefined) {
      throw new Error('Selector type not defined ' + this.type);
    }

    // overrides objects methods
    for (var i in selectors[this.type]) {
      this[i] = selectors[this.type][i];
    }
  },

  /**
   * Check whether a selector is a paren selector of this selector
   * @param selectorId
   * @returns {boolean}
   */
  hasParentSelector: function (selectorId) {
    return this.parentSelectors.indexOf(selectorId) !== -1;
  },

  removeParentSelector: function (selectorId) {
    var index = this.parentSelectors.indexOf(selectorId);
    if (index !== -1) {
      this.parentSelectors.splice(index, 1);
    }
  },

  renameParentSelector: function (originalId, replacementId) {
    if (this.hasParentSelector(originalId)) {
      var pos = this.parentSelectors.indexOf(originalId);
      this.parentSelectors.splice(pos, 1, replacementId);
    }
  },

  getDataElements: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var elements = ElementQuery(this.selector, parentElement, { $, document, window });
    if (this.multiple) {
      return elements;
    } else if (elements.length > 0) {
      return [elements[0]];
    } else {
      return [];
    }
  },

  getData: function (parentElement) {
    var d = jquery.Deferred();
    var timeout = this.delay || 0;

    // this works much faster because whenCallSequentally isn't running next data extraction immediately
    if (timeout === 0) {
      var deferredData = this._getData(parentElement);
      deferredData.done(function (data) {
        d.resolve(data);
      });
    } else {
      setTimeout(function () {
        var deferredData = this._getData(parentElement);
        deferredData.done(function (data) {
          d.resolve(data);
        });
      }.bind(this), timeout);
    }

    return d.promise();
  }
};

module.exports = Selector;

},{"./ElementQuery":8,"./Selectors":23,"debug":29,"jquery-deferred":31}],10:[function(require,module,exports){
var Selector = require('./Selector');

var SelectorList = function (selectors, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");

  if (selectors === null || selectors === undefined) {
    return;
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i]);
  }
};

SelectorList.prototype = [];

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      var $ = this.$;
      var document = this.document;
      var window = this.window;
      selector = new Selector(selector, { $, window, document });
    }
    Array.prototype.push.call(this, selector);
  }
};

SelectorList.prototype.hasSelector = function (selectorId) {
  if (selectorId instanceof Object) {
    selectorId = selectorId.id;
  }

  for (var i = 0; i < this.length; i++) {
    if (this[i].id === selectorId) {
      return true;
    }
  }
  return false;
};

/**
 * Returns all selectors or recursively find and return all child selectors of a parent selector.
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getAllSelectors = function (parentSelectorId) {
  if (parentSelectorId === undefined) {
    return this;
  }

  var getAllChildSelectors = function (parentSelectorId, resultSelectors) {
    this.forEach(function (selector) {
      if (selector.hasParentSelector(parentSelectorId)) {
        if (resultSelectors.indexOf(selector) === -1) {
          resultSelectors.push(selector);
          getAllChildSelectors(selector.id, resultSelectors);
        }
      }
    });
  }.bind(this);

  var resultSelectors = [];
  getAllChildSelectors(parentSelectorId, resultSelectors);
  return resultSelectors;
};

/**
 * Returns only selectors that are directly under a parent
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getDirectChildSelectors = function (parentSelectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultSelectors = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector);
    }
  });
  return resultSelectors;
};

SelectorList.prototype.clone = function () {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    resultList.push(selector);
  });
  return resultList;
};

SelectorList.prototype.fullClone = function () {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    resultList.push(JSON.parse(JSON.stringify(selector)));
  });
  return resultList;
};

SelectorList.prototype.concat = function () {
  var resultList = this.clone();
  for (var i in arguments) {
    arguments[i].forEach(function (selector) {
      resultList.push(selector);
    });
  }
  return resultList;
};

SelectorList.prototype.getSelector = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i];
    if (selector.id === selectorId) {
      return selector;
    }
  }
};

/**
 * Returns all selectors if this selectors including all parent selectors within this page
 * @TODO not used any more.
 * @param selectorId
 * @returns {*}
 */
SelectorList.prototype.getOnePageSelectors = function (selectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  var selector = this.getSelector(selectorId);
  resultList.push(this.getSelector(selectorId));

  // recursively find all parent selectors that could lead to the page where selectorId is used.
  var findParentSelectors = function (selector) {
    selector.parentSelectors.forEach(function (parentSelectorId) {
      if (parentSelectorId === '_root') return;
      var parentSelector = this.getSelector(parentSelectorId);
      if (resultList.indexOf(parentSelector) !== -1) return;
      if (parentSelector.willReturnElements()) {
        resultList.push(parentSelector);
        findParentSelectors(parentSelector);
      }
    }.bind(this));
  }.bind(this);

  findParentSelectors(selector);

  // add all child selectors
  resultList = resultList.concat(this.getSinglePageAllChildSelectors(selector.id));
  return resultList;
};

/**
 * Returns all child selectors of a selector which can be used within one page.
 * @param parentSelectorId
 */
SelectorList.prototype.getSinglePageAllChildSelectors = function (parentSelectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  var addChildSelectors = function (parentSelector) {
    if (parentSelector.willReturnElements()) {
      var childSelectors = this.getDirectChildSelectors(parentSelector.id);
      childSelectors.forEach(function (childSelector) {
        if (resultList.indexOf(childSelector) === -1) {
          resultList.push(childSelector);
          addChildSelectors(childSelector);
        }
      });
    }
  }.bind(this);

  var parentSelector = this.getSelector(parentSelectorId);
  addChildSelectors(parentSelector);
  return resultList;
};

SelectorList.prototype.willReturnMultipleRecords = function (selectorId) {
  // handle reuqested selector
  var selector = this.getSelector(selectorId);
  if (selector.willReturnMultipleRecords() === true) {
    return true;
  }

  // handle all its child selectors
  var childSelectors = this.getAllSelectors(selectorId);
  for (var i = 0; i < childSelectors.length; i++) {
    var selector = childSelectors[i];
    if (selector.willReturnMultipleRecords() === true) {
      return true;
    }
  }

  return false;
};

/**
 * When serializing to JSON convert to an array
 * @returns {Array}
 */
SelectorList.prototype.toJSON = function () {
  var result = [];
  this.forEach(function (selector) {
    result.push(selector);
  });
  return result;
};

SelectorList.prototype.getSelectorById = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i];
    if (selector.id === selectorId) {
      return selector;
    }
  }
};

/**
 * returns css selector for a given element. css selector includes all parent element selectors
 * @param selectorId
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getCSSSelectorWithinOnePage = function (selectorId, parentSelectorIds) {
  var CSSSelector = this.getSelector(selectorId).selector;
  var parentCSSSelector = this.getParentCSSSelectorWithinOnePage(parentSelectorIds);
  CSSSelector = parentCSSSelector + CSSSelector;

  return CSSSelector;
};

/**
 * returns css selector for parent selectors that are within one page
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getParentCSSSelectorWithinOnePage = function (parentSelectorIds) {
  var CSSSelector = '';

  for (var i = parentSelectorIds.length - 1; i > 0; i--) {
    var parentSelectorId = parentSelectorIds[i];
    var parentSelector = this.getSelector(parentSelectorId);
    if (parentSelector.willReturnElements()) {
      CSSSelector = parentSelector.selector + ' ' + CSSSelector;
    } else {
      break;
    }
  }

  return CSSSelector;
};

SelectorList.prototype.hasRecursiveElementSelectors = function () {
  var RecursionFound = false;

  this.forEach(function (topSelector) {
    var visitedSelectors = [];

    var checkRecursion = function (parentSelector) {
      // already visited
      if (visitedSelectors.indexOf(parentSelector) !== -1) {
        RecursionFound = true;
        return;
      }

      if (parentSelector.willReturnElements()) {
        visitedSelectors.push(parentSelector);
        var childSelectors = this.getDirectChildSelectors(parentSelector.id);
        childSelectors.forEach(checkRecursion);
        visitedSelectors.pop();
      }
    }.bind(this);

    checkRecursion(topSelector);
  }.bind(this));

  return RecursionFound;
};

module.exports = SelectorList;

},{"./Selector":9}],11:[function(require,module,exports){
var jquery = require('jquery-deferred');

var SelectorElement = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);
    dfd.resolve(this.$.makeArray(elements));

    return dfd.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  }
};

module.exports = SelectorElement;

},{"jquery-deferred":31}],12:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorElementAttribute = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    var elements = this.getDataElements(parentElement);

    var result = [];
    self.$(elements).each(function (k, element) {
      var data = {};

      data[this.id] = self.$(element).attr(this.extractAttribute);
      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id + '-src'] = null;
      result.push(data);
    }
    dfd.resolve(result);

    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'extractAttribute', 'delay'];
  }
};

module.exports = SelectorElementAttribute;

},{"jquery-deferred":31}],13:[function(require,module,exports){
var jquery = require('jquery-deferred');
var UniqueElementList = require('./../UniqueElementList');
var ElementQuery = require('./../ElementQuery');

if (typeof globalThis === 'undefined') {
	globalThis = function () {
		if (typeof self !== 'undefined') {
			return self;
		} else if (typeof window !== 'undefined') {
			return window;
		} else {
			return Function('return this')();
		}
	}();
}

if (!globalThis.CssSelector || !globalThis.ElementSelector) {
	globalThis.CssSelector = function CssSelector(options) {

		var me = this;

		// defaults
		this.ignoredTags = ['font', 'b', 'i', 's'];
		this.parent = document;
		this.ignoredClassBase = false;
		this.enableResultStripping = true;
		this.enableSmartTableSelector = false;
		this.ignoredClasses = [];
		this.query = function (selector) {
			return me.parent.querySelectorAll(selector);
		};

		// overrides defaults with options
		for (var i in options) {
			this[i] = options[i];
		}

		// jquery parent selector fix
		if (this.query === window.jQuery) {
			this.query = function (selector) {
				return jQuery(me.parent).find(selector);
			};
		}
	};

	// TODO refactor element selector list into a ~ class
	globalThis.ElementSelector = function ElementSelector(element, ignoredClasses) {

		this.element = element;
		this.isDirectChild = true;
		this.tag = element.localName;

		// nth-of-child(n+1)
		this.indexn = null;
		this.index = 1;
		if (element.parentNode !== undefined) {
			// nth-child
			//this.index = [].indexOf.call(element.parentNode.children, element)+1;

			// nth-of-type
			for (var i = 0; i < element.parentNode.children.length; i++) {
				var child = element.parentNode.children[i];
				if (child === element) {
					break;
				}
				if (child.tagName === element.tagName) {
					this.index++;
				}
			}
		}
		this.id = null;
		if (element.id !== '') {
			if (typeof element.id === 'string') {
				this.id = element.id;
			}
		}

		this.classes = new Array();
		for (var i = 0; i < element.classList.length; i++) {
			var cclass = element.classList[i];
			if (ignoredClasses.indexOf(cclass) === -1) {
				this.classes.push(cclass);
			}
		}
	};

	globalThis.ElementSelectorList = function ElementSelectorList(CssSelector) {
		this.CssSelector = CssSelector;
	};

	globalThis.ElementSelectorList.prototype = new Array();

	globalThis.ElementSelectorList.prototype.getCssSelector = function () {

		var resultSelectors = [];

		// TDD
		for (var i = 0; i < this.length; i++) {
			var selector = this[i];

			var isFirstSelector = i === this.length - 1;
			var resultSelector = selector.getCssSelector(isFirstSelector);

			if (this.CssSelector.enableSmartTableSelector) {
				if (selector.tag === 'tr') {
					if (selector.element.children.length === 2) {
						if (selector.element.children[0].tagName === 'TD' || selector.element.children[0].tagName === 'TH' || selector.element.children[0].tagName === 'TR') {

							var text = selector.element.children[0].textContent;
							text = text.trim();

							// escape quotes
							text.replace(/(\\*)(')/g, function (x) {
								var l = x.length;
								return l % 2 ? x : x.substring(0, l - 1) + "\\'";
							});
							resultSelector += ":contains('" + text + "')";
						}
					}
				}
			}

			resultSelectors.push(resultSelector);
		}

		var resultCSSSelector = resultSelectors.reverse().join(' ');
		return resultCSSSelector;
	};

	globalThis.ElementSelector.prototype = {

		getCssSelector: function (isFirstSelector) {

			if (isFirstSelector === undefined) {
				isFirstSelector = false;
			}

			var selector = this.tag;
			if (this.id !== null) {
				selector += '#' + this.id;
			}
			if (this.classes.length) {
				for (var i = 0; i < this.classes.length; i++) {
					selector += "." + this.classes[i];
				}
			}
			if (this.index !== null) {
				selector += ':nth-of-type(' + this.index + ')';
			}
			if (this.indexn !== null && this.indexn !== -1) {
				selector += ':nth-of-type(n+' + this.indexn + ')';
			}
			if (this.isDirectChild && isFirstSelector === false) {
				selector = "> " + selector;
			}

			return selector;
		},
		// merges this selector with another one.
		merge: function (mergeSelector) {

			if (this.tag !== mergeSelector.tag) {
				throw "different element selected (tag)";
			}

			if (this.index !== null) {
				if (this.index !== mergeSelector.index) {

					// use indexn only for two elements
					if (this.indexn === null) {
						var indexn = Math.min(mergeSelector.index, this.index);
						if (indexn > 1) {
							this.indexn = Math.min(mergeSelector.index, this.index);
						}
					} else {
						this.indexn = -1;
					}

					this.index = null;
				}
			}

			if (this.isDirectChild === true) {
				this.isDirectChild = mergeSelector.isDirectChild;
			}

			if (this.id !== null) {
				if (this.id !== mergeSelector.id) {
					this.id = null;
				}
			}

			if (this.classes.length !== 0) {
				var classes = new Array();

				for (var i in this.classes) {
					var cclass = this.classes[i];
					if (mergeSelector.classes.indexOf(cclass) !== -1) {
						classes.push(cclass);
					}
				}

				this.classes = classes;
			}
		}
	};

	globalThis.CssSelector.prototype = {
		mergeElementSelectors: function (newSelecors) {

			if (newSelecors.length < 1) {
				throw "No selectors specified";
			} else if (newSelecors.length === 1) {
				return newSelecors[0];
			}

			// check selector total count
			var elementCountInSelector = newSelecors[0].length;
			for (var i = 0; i < newSelecors.length; i++) {
				var selector = newSelecors[i];
				if (selector.length !== elementCountInSelector) {
					throw "Invalid element count in selector";
				}
			}

			// merge selectors
			var resultingElements = newSelecors[0];
			for (var i = 1; i < newSelecors.length; i++) {
				var mergeElements = newSelecors[i];

				for (var j = 0; j < elementCountInSelector; j++) {
					resultingElements[j].merge(mergeElements[j]);
				}
			}
			return resultingElements;
		},
		stripSelector: function (selectors) {

			var cssSeletor = selectors.getCssSelector();
			var baseSelectedElements = this.query(cssSeletor);

			var compareElements = function (elements) {
				if (baseSelectedElements.length !== elements.length) {
					return false;
				}

				for (var j = 0; j < baseSelectedElements.length; j++) {
					if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
						return false;
					}
				}
				return true;
			};
			// strip indexes
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.index !== null) {
					var index = selector.index;
					selector.index = null;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.index = index;
					}
				}
			}

			// strip isDirectChild
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.isDirectChild === true) {
					selector.isDirectChild = false;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.isDirectChild = true;
					}
				}
			}

			// strip ids
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.id !== null) {
					var id = selector.id;
					selector.id = null;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.id = id;
					}
				}
			}

			// strip classes
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.classes.length !== 0) {
					for (var j = selector.classes.length - 1; j > 0; j--) {
						var cclass = selector.classes[j];
						selector.classes.splice(j, 1);
						var cssSeletor = selectors.getCssSelector();
						var newSelectedElements = this.query(cssSeletor);
						// if results doesn't match then undo changes
						if (!compareElements(newSelectedElements)) {
							selector.classes.splice(j, 0, cclass);
						}
					}
				}
			}

			// strip tags
			for (var i = selectors.length - 1; i > 0; i--) {
				var selector = selectors[i];
				selectors.splice(i, 1);
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selectors.splice(i, 0, selector);
				}
			}

			return selectors;
		},
		getElementSelectors: function (elements, top) {
			var elementSelectors = [];

			for (var i = 0; i < elements.length; i++) {
				var element = elements[i];
				var elementSelector = this.getElementSelector(element, top);
				elementSelectors.push(elementSelector);
			}

			return elementSelectors;
		},
		getElementSelector: function (element, top) {

			var elementSelectorList = new ElementSelectorList(this);
			while (true) {
				if (element === this.parent) {
					break;
				} else if (element === undefined || element.tagName === 'body' || element.tagName === 'BODY') {
					throw 'element is not a child of the given parent';
				}
				if (this.isIgnoredTag(element.tagName)) {

					element = element.parentNode;
					continue;
				}
				if (top > 0) {
					top--;
					element = element.parentNode;
					continue;
				}

				var selector = new ElementSelector(element, this.ignoredClasses);
				if (this.isIgnoredTag(element.parentNode.tagName)) {
					selector.isDirectChild = false;
				}

				elementSelectorList.push(selector);
				element = element.parentNode;
			}

			return elementSelectorList;
		},
		getCssSelector: function (elements, top) {

			top = top || 0;

			var enableSmartTableSelector = this.enableSmartTableSelector;
			if (elements.length > 1) {
				this.enableSmartTableSelector = false;
			}

			var elementSelectors = this.getElementSelectors(elements, top);
			var resultSelector = this.mergeElementSelectors(elementSelectors);
			if (this.enableResultStripping) {
				resultSelector = this.stripSelector(resultSelector);
			}

			this.enableSmartTableSelector = enableSmartTableSelector;

			// strip down selector
			return resultSelector.getCssSelector();
		},
		isIgnoredTag: function (tag) {
			return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
		}
	};
}

var ElementSelector = globalThis.ElementSelector;
var CssSelector = globalThis.CssSelector;

var SelectorElementClick = {

	canReturnMultipleRecords: function () {
		return true;
	},

	canHaveChildSelectors: function () {
		return true;
	},

	canHaveLocalChildSelectors: function () {
		return true;
	},

	canCreateNewJobs: function () {
		return false;
	},
	willReturnElements: function () {
		return true;
	},

	getClickElements: function (parentElement) {
		var $ = this.$;
		var document = this.document;
		var window = this.window;
		var clickElements = ElementQuery(this.clickElementSelector, parentElement, { $, document, window });
		return clickElements;
	},

	/**
  * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
  * @param element
  */
	isElementInHTML: function (element) {
		return this.$(element).closest('html').length !== 0;
	},

	triggerButtonClick: function (clickElement) {
		var document = this.document;
		var cs = new CssSelector({
			enableSmartTableSelector: false,
			parent: this.$('body')[0],
			enableResultStripping: false
		});
		var cssSelector = cs.getCssSelector([clickElement]);

		document.querySelectorAll(cssSelector)[0].click();
		/*    // this function will catch window.open call and place the requested url as the elements data attribute
      var script = document.createElement('script')
      script.type = 'text/javascript'
      script.text = '' +
  			'(function(){ ' +
  			"var el = document.querySelectorAll('" + cssSelector + "')[0]; " +
  			'el.click(); ' +
  			'})();'
      document.body.appendChild(script)*/
	},

	getClickElementUniquenessType: function () {
		if (this.clickElementUniquenessType === undefined) {
			return 'uniqueText';
		} else {
			return this.clickElementUniquenessType;
		}
	},

	_getData: function (parentElement) {
		var $ = this.$;
		var document = this.document;
		var window = this.window;
		var delay = parseInt(this.delay) || 0;
		var deferredResponse = jquery.Deferred();
		var foundElements = new UniqueElementList('uniqueText', { $, document, window });
		var clickElements = this.getClickElements(parentElement);
		var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType(), { $, document, window });

		// add elements that are available before clicking
		var elements = this.getDataElements(parentElement);
		elements.forEach(foundElements.push.bind(foundElements));

		// discard initial elements
		if (this.discardInitialElements) {
			foundElements = new UniqueElementList('uniqueText', { $, document, window });
		}

		// no elements to click at the beginning
		if (clickElements.length === 0) {
			deferredResponse.resolve(foundElements);
			return deferredResponse.promise();
		}

		// initial click and wait
		var currentClickElement = clickElements[0];
		this.triggerButtonClick(currentClickElement);
		var nextElementSelection = new Date().getTime() + delay;

		// infinitely scroll down and find all items
		var interval = setInterval(function () {
			// find those click elements that are not in the black list
			var allClickElements = this.getClickElements(parentElement);
			clickElements = [];
			allClickElements.forEach(function (element) {
				if (!doneClickingElements.isAdded(element)) {
					clickElements.push(element);
				}
			});

			var now = new Date().getTime();
			// sleep. wait when to extract next elements
			if (now < nextElementSelection) {
				// debug("wait");
				return;
			}

			// add newly found elements to element foundElements array.
			var elements = this.getDataElements(parentElement);
			var addedAnElement = false;
			elements.forEach(function (element) {
				var added = foundElements.push(element);
				if (added) {
					addedAnElement = true;
				}
			});
			// debug("added", addedAnElement);

			// no new elements found. Stop clicking this button
			if (!addedAnElement) {
				doneClickingElements.push(currentClickElement);
			}

			// continue clicking and add delay, but if there is nothing
			// more to click the finish
			// debug("total buttons", clickElements.length)
			if (clickElements.length === 0) {
				clearInterval(interval);
				deferredResponse.resolve(foundElements);
			} else {
				// debug("click");
				currentClickElement = clickElements[0];
				// click on elements only once if the type is clickonce
				if (this.clickType === 'clickOnce') {
					doneClickingElements.push(currentClickElement);
				}
				this.triggerButtonClick(currentClickElement);
				nextElementSelection = now + delay;
			}
		}.bind(this), 50);

		return deferredResponse.promise();
	},

	getDataColumns: function () {
		return [];
	},

	getFeatures: function () {
		return ['multiple', 'delay', 'clickElementSelector', 'clickType', 'discardInitialElements', 'clickElementUniquenessType'];
	}
};

module.exports = SelectorElementClick;

},{"./../ElementQuery":8,"./../UniqueElementList":26,"jquery-deferred":31}],14:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorElementScroll = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },
  scrollToBottom: function () {
    var document = this.document;
    window.scrollTo(0, document.body.scrollHeight);
  },
  _getData: function (parentElement) {
    var delay = parseInt(this.delay) || 0;
    var deferredResponse = jquery.Deferred();
    var foundElements = [];

    // initially scroll down and wait
    this.scrollToBottom();
    var nextElementSelection = new Date().getTime() + delay;

    // infinitely scroll down and find all items
    var interval = setInterval(function () {
      var now = new Date().getTime();
      // sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        return;
      }

      var elements = this.getDataElements(parentElement);
      // no new elements found
      if (elements.length === foundElements.length) {
        clearInterval(interval);
        deferredResponse.resolve(this.$.makeArray(elements));
      } else {
        // continue scrolling and add delay
        foundElements = elements;
        this.scrollToBottom();
        nextElementSelection = now + delay;
      }
    }.bind(this), 50);

    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  }
};

module.exports = SelectorElementScroll;

},{"jquery-deferred":31}],15:[function(require,module,exports){
const url = require('url');
const jquery = require('jquery-deferred');
const debug = require('debug')('web-scraper-headless:selector-goog-map-id');

var SelectorGoogMapID = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  getMapID: function ($container) {
    const $ = this.$;
    const mapSelector = this.getMapsSelector();
    const mUrl = $($container).find(mapSelector).attr('src');
    if (!mUrl) {
      debug('Goog map url was undefined');
      return '';
    }
    const mQuery = url.parse(mUrl, true).query;
    const pb = mQuery ? mQuery.pb : null;
    if (!pb) {
      debug('Pb in query was undefined in url', url);
      return '';
    }
    const match = pb.match(/0x[0-9a-f]{15,16}:0x[0-9a-f]{15,16}/);
    if (!match) {
      debug('Could not find fid in pb', pb);
      return '';
    }
    return match[0];
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var $ = this.$;

    // easier to select divs containing the iframe
    var containers = this.getDataElements(parentElement);
    const result = [];
    var selector = this;
    $(containers).each(function (k, container) {
      const mapId = selector.getMapID($(container));
      result.push({ [selector.id + '_FTID']: mapId });
    });

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id + '_FTID', this.id + '_PID', this.id + '_CID'];
  },

  getFeatures: function () {
    return ['mapsSelectorFromDiv'];
  },

  getItemCSSSelector: function () {
    // We get the container
    return '*:not(div.overlay)';
  },

  getMapsSelectorFromDivHTML: function (html, options = {}) {
    const $ = options.$ || this.$;
    const div = $(html);
    const defaultSelector = 'iframe[src*="google.com/maps/embed"]';
    if (div.find(defaultSelector).length) {
      return defaultSelector;
    }
    return '';
  },

  getMapsSelector: function () {
    if (this.mapsSelectorFromDiv === undefined) {
      return 'iframe[src*="google.com/maps/embed"]';
    } else {
      return this.mapsSelectorFromDiv;
    }
  }
};

module.exports = SelectorGoogMapID;

},{"debug":29,"jquery-deferred":31,"url":41}],16:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorGroup = {

  canReturnMultipleRecords: function () {
    return false;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    // cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = self.$(this.selector, parentElement);

    var records = [];
    self.$(elements).each(function (k, element) {
      var data = {};

      data[this.id] = self.$(element).text();

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = self.$(element).attr(this.extractAttribute);
      }

      records.push(data);
    }.bind(this));

    var result = {};
    result[this.id] = records;

    dfd.resolve([result]);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['delay', 'extractAttribute'];
  }
};

module.exports = SelectorGroup;

},{"jquery-deferred":31}],17:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorHTML = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    var elements = this.getDataElements(parentElement);

    var result = [];
    self.$(elements).each(function (k, element) {
      var data = {};
      var html = self.$(element).html();

      if (this.regex !== undefined && this.regex.length) {
        var matches = html.match(new RegExp(this.regex));
        if (matches !== null) {
          html = matches[0];
        } else {
          html = null;
        }
      }
      data[this.id] = html;

      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      result.push(data);
    }

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay'];
  }
};

module.exports = SelectorHTML;

},{"jquery-deferred":31}],18:[function(require,module,exports){
var jquery = require('jquery-deferred');
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');
var Base64 = require('../../assets/base64');
var SelectorImage = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);

    var deferredDataCalls = [];
    this.$(elements).each(function (i, element) {
      deferredDataCalls.push(function () {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id + '-src'] = element.src;

        // download image if required
        if (!this.downloadImage) {
          deferredData.resolve(data);
        } else {
          var deferredImageBase64 = this.downloadImageBase64(element.src);

          deferredImageBase64.done(function (imageResponse) {
            data['_imageBase64-' + this.id] = imageResponse.imageBase64;
            data['_imageMimeType-' + this.id] = imageResponse.mimeType;

            deferredData.resolve(data);
          }.bind(this)).fail(function () {
            // failed to download image continue.
            // @TODO handle errror
            deferredData.resolve(data);
          });
        }

        return deferredData.promise();
      }.bind(this));
    }.bind(this));

    whenCallSequentially(deferredDataCalls).done(function (dataResults) {
      if (this.multiple === false && elements.length === 0) {
        var data = {};
        data[this.id + '-src'] = null;
        dataResults.push(data);
      }

      dfd.resolve(dataResults);
    });

    return dfd.promise();
  },

  downloadFileAsBlob: function (url) {
    var window = this.window;
    var deferredResponse = jquery.Deferred();
    var xhr = new window.XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          var blob = this.response;
          deferredResponse.resolve(blob);
        } else {
          deferredResponse.reject(xhr.statusText);
        }
      }
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();

    return deferredResponse.promise();
  },

  downloadImageBase64: function (url) {
    var deferredResponse = jquery.Deferred();
    var deferredDownload = this.downloadFileAsBlob(url);
    deferredDownload.done(function (blob) {
      var mimeType = blob.type;
      var deferredBlob = Base64.blobToBase64(blob);
      deferredBlob.done(function (imageBase64) {
        deferredResponse.resolve({
          mimeType: mimeType,
          imageBase64: imageBase64
        });
      });
    }).fail(deferredResponse.fail);
    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [this.id + '-src'];
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'downloadImage'];
  },

  getItemCSSSelector: function () {
    return 'img';
  }
};

module.exports = SelectorImage;

},{"../../assets/base64":1,"../../assets/jquery.whencallsequentially":2,"jquery-deferred":31}],19:[function(require,module,exports){
var jquery = require('jquery-deferred');
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');

var SelectorLink = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return true;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var elements = this.getDataElements(parentElement);
    var self = this;

    var dfd = jquery.Deferred();

    // return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      dfd.resolve([data]);
      return dfd;
    }

    // extract links one by one
    var deferredDataExtractionCalls = [];
    self.$(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id] = self.$(element).text();
        data._followSelectorId = this.id;
        data[this.id + '-href'] = element.href;
        data._follow = element.href;
        deferredData.resolve(data);

        return deferredData;
      }.bind(this, element));
    }.bind(this));

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = [];
      responses.forEach(function (dataResult) {
        result.push(dataResult);
      });
      dfd.resolve(result);
    });

    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href'];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  },

  getItemCSSSelector: function () {
    return 'a';
  }
};

module.exports = SelectorLink;

},{"../../assets/jquery.whencallsequentially":2,"jquery-deferred":31}],20:[function(require,module,exports){
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');
var jquery = require('jquery-deferred');

if (typeof globalThis === 'undefined') {
	globalThis = function () {
		if (typeof self !== 'undefined') {
			return self;
		} else if (typeof window !== 'undefined') {
			return window;
		} else {
			return Function('return this')();
		}
	}();
}

if (!globalThis.CssSelector || !globalThis.ElementSelector) {
	globalThis.CssSelector = function CssSelector(options) {

		var me = this;

		// defaults
		this.ignoredTags = ['font', 'b', 'i', 's'];
		this.parent = document;
		this.ignoredClassBase = false;
		this.enableResultStripping = true;
		this.enableSmartTableSelector = false;
		this.ignoredClasses = [];
		this.query = function (selector) {
			return me.parent.querySelectorAll(selector);
		};

		// overrides defaults with options
		for (var i in options) {
			this[i] = options[i];
		}

		// jquery parent selector fix
		if (this.query === window.jQuery) {
			this.query = function (selector) {
				return jQuery(me.parent).find(selector);
			};
		}
	};

	// TODO refactor element selector list into a ~ class
	globalThis.ElementSelector = function ElementSelector(element, ignoredClasses) {

		this.element = element;
		this.isDirectChild = true;
		this.tag = element.localName;

		// nth-of-child(n+1)
		this.indexn = null;
		this.index = 1;
		if (element.parentNode !== undefined) {
			// nth-child
			//this.index = [].indexOf.call(element.parentNode.children, element)+1;

			// nth-of-type
			for (var i = 0; i < element.parentNode.children.length; i++) {
				var child = element.parentNode.children[i];
				if (child === element) {
					break;
				}
				if (child.tagName === element.tagName) {
					this.index++;
				}
			}
		}
		this.id = null;
		if (element.id !== '') {
			if (typeof element.id === 'string') {
				this.id = element.id;
			}
		}

		this.classes = new Array();
		for (var i = 0; i < element.classList.length; i++) {
			var cclass = element.classList[i];
			if (ignoredClasses.indexOf(cclass) === -1) {
				this.classes.push(cclass);
			}
		}
	};

	globalThis.ElementSelectorList = function ElementSelectorList(CssSelector) {
		this.CssSelector = CssSelector;
	};

	globalThis.ElementSelectorList.prototype = new Array();

	globalThis.ElementSelectorList.prototype.getCssSelector = function () {

		var resultSelectors = [];

		// TDD
		for (var i = 0; i < this.length; i++) {
			var selector = this[i];

			var isFirstSelector = i === this.length - 1;
			var resultSelector = selector.getCssSelector(isFirstSelector);

			if (this.CssSelector.enableSmartTableSelector) {
				if (selector.tag === 'tr') {
					if (selector.element.children.length === 2) {
						if (selector.element.children[0].tagName === 'TD' || selector.element.children[0].tagName === 'TH' || selector.element.children[0].tagName === 'TR') {

							var text = selector.element.children[0].textContent;
							text = text.trim();

							// escape quotes
							text.replace(/(\\*)(')/g, function (x) {
								var l = x.length;
								return l % 2 ? x : x.substring(0, l - 1) + "\\'";
							});
							resultSelector += ":contains('" + text + "')";
						}
					}
				}
			}

			resultSelectors.push(resultSelector);
		}

		var resultCSSSelector = resultSelectors.reverse().join(' ');
		return resultCSSSelector;
	};

	globalThis.ElementSelector.prototype = {

		getCssSelector: function (isFirstSelector) {

			if (isFirstSelector === undefined) {
				isFirstSelector = false;
			}

			var selector = this.tag;
			if (this.id !== null) {
				selector += '#' + this.id;
			}
			if (this.classes.length) {
				for (var i = 0; i < this.classes.length; i++) {
					selector += "." + this.classes[i];
				}
			}
			if (this.index !== null) {
				selector += ':nth-of-type(' + this.index + ')';
			}
			if (this.indexn !== null && this.indexn !== -1) {
				selector += ':nth-of-type(n+' + this.indexn + ')';
			}
			if (this.isDirectChild && isFirstSelector === false) {
				selector = "> " + selector;
			}

			return selector;
		},
		// merges this selector with another one.
		merge: function (mergeSelector) {

			if (this.tag !== mergeSelector.tag) {
				throw "different element selected (tag)";
			}

			if (this.index !== null) {
				if (this.index !== mergeSelector.index) {

					// use indexn only for two elements
					if (this.indexn === null) {
						var indexn = Math.min(mergeSelector.index, this.index);
						if (indexn > 1) {
							this.indexn = Math.min(mergeSelector.index, this.index);
						}
					} else {
						this.indexn = -1;
					}

					this.index = null;
				}
			}

			if (this.isDirectChild === true) {
				this.isDirectChild = mergeSelector.isDirectChild;
			}

			if (this.id !== null) {
				if (this.id !== mergeSelector.id) {
					this.id = null;
				}
			}

			if (this.classes.length !== 0) {
				var classes = new Array();

				for (var i in this.classes) {
					var cclass = this.classes[i];
					if (mergeSelector.classes.indexOf(cclass) !== -1) {
						classes.push(cclass);
					}
				}

				this.classes = classes;
			}
		}
	};

	globalThis.CssSelector.prototype = {
		mergeElementSelectors: function (newSelecors) {

			if (newSelecors.length < 1) {
				throw "No selectors specified";
			} else if (newSelecors.length === 1) {
				return newSelecors[0];
			}

			// check selector total count
			var elementCountInSelector = newSelecors[0].length;
			for (var i = 0; i < newSelecors.length; i++) {
				var selector = newSelecors[i];
				if (selector.length !== elementCountInSelector) {
					throw "Invalid element count in selector";
				}
			}

			// merge selectors
			var resultingElements = newSelecors[0];
			for (var i = 1; i < newSelecors.length; i++) {
				var mergeElements = newSelecors[i];

				for (var j = 0; j < elementCountInSelector; j++) {
					resultingElements[j].merge(mergeElements[j]);
				}
			}
			return resultingElements;
		},
		stripSelector: function (selectors) {

			var cssSeletor = selectors.getCssSelector();
			var baseSelectedElements = this.query(cssSeletor);

			var compareElements = function (elements) {
				if (baseSelectedElements.length !== elements.length) {
					return false;
				}

				for (var j = 0; j < baseSelectedElements.length; j++) {
					if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
						return false;
					}
				}
				return true;
			};
			// strip indexes
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.index !== null) {
					var index = selector.index;
					selector.index = null;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.index = index;
					}
				}
			}

			// strip isDirectChild
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.isDirectChild === true) {
					selector.isDirectChild = false;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.isDirectChild = true;
					}
				}
			}

			// strip ids
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.id !== null) {
					var id = selector.id;
					selector.id = null;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.id = id;
					}
				}
			}

			// strip classes
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.classes.length !== 0) {
					for (var j = selector.classes.length - 1; j > 0; j--) {
						var cclass = selector.classes[j];
						selector.classes.splice(j, 1);
						var cssSeletor = selectors.getCssSelector();
						var newSelectedElements = this.query(cssSeletor);
						// if results doesn't match then undo changes
						if (!compareElements(newSelectedElements)) {
							selector.classes.splice(j, 0, cclass);
						}
					}
				}
			}

			// strip tags
			for (var i = selectors.length - 1; i > 0; i--) {
				var selector = selectors[i];
				selectors.splice(i, 1);
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selectors.splice(i, 0, selector);
				}
			}

			return selectors;
		},
		getElementSelectors: function (elements, top) {
			var elementSelectors = [];

			for (var i = 0; i < elements.length; i++) {
				var element = elements[i];
				var elementSelector = this.getElementSelector(element, top);
				elementSelectors.push(elementSelector);
			}

			return elementSelectors;
		},
		getElementSelector: function (element, top) {

			var elementSelectorList = new ElementSelectorList(this);
			while (true) {
				if (element === this.parent) {
					break;
				} else if (element === undefined || element.tagName === 'body' || element.tagName === 'BODY') {
					throw 'element is not a child of the given parent';
				}
				if (this.isIgnoredTag(element.tagName)) {

					element = element.parentNode;
					continue;
				}
				if (top > 0) {
					top--;
					element = element.parentNode;
					continue;
				}

				var selector = new ElementSelector(element, this.ignoredClasses);
				if (this.isIgnoredTag(element.parentNode.tagName)) {
					selector.isDirectChild = false;
				}

				elementSelectorList.push(selector);
				element = element.parentNode;
			}

			return elementSelectorList;
		},
		getCssSelector: function (elements, top) {

			top = top || 0;

			var enableSmartTableSelector = this.enableSmartTableSelector;
			if (elements.length > 1) {
				this.enableSmartTableSelector = false;
			}

			var elementSelectors = this.getElementSelectors(elements, top);
			var resultSelector = this.mergeElementSelectors(elementSelectors);
			if (this.enableResultStripping) {
				resultSelector = this.stripSelector(resultSelector);
			}

			this.enableSmartTableSelector = enableSmartTableSelector;

			// strip down selector
			return resultSelector.getCssSelector();
		},
		isIgnoredTag: function (tag) {
			return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
		}
	};
}

var CssSelector = globalThis.CssSelector;

const debug = require('debug')('web-scraper-headless:selector:selector-popup-link');
var SelectorPopupLink = {
	canReturnMultipleRecords: function () {
		return true;
	},

	canHaveChildSelectors: function () {
		return true;
	},

	canHaveLocalChildSelectors: function () {
		return false;
	},

	canCreateNewJobs: function () {
		return true;
	},
	willReturnElements: function () {
		return false;
	},
	_getData: function (parentElement) {
		var $ = this.$;
		var document = this.document;
		var window = this.window;
		var elements = this.getDataElements(parentElement);

		var dfd = jquery.Deferred();

		// return empty record if not multiple type and no elements found
		if (this.multiple === false && elements.length === 0) {
			var data = {};
			data[this.id] = null;
			dfd.resolve([data]);
			return dfd;
		}

		// extract links one by one
		var deferredDataExtractionCalls = [];
		$(elements).each(function (k, element) {
			deferredDataExtractionCalls.push(function (element) {
				var deferredData = jquery.Deferred();

				var data = {};
				data[this.id] = $(element).text();
				data._followSelectorId = this.id;

				var deferredPopupURL = this.getPopupURL(element);
				deferredPopupURL.done(function (url) {
					data[this.id + '-href'] = url;
					data._follow = url;
					deferredData.resolve(data);
				}.bind(this));

				return deferredData;
			}.bind(this, element));
		}.bind(this));

		whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
			var result = [];
			responses.forEach(function (dataResult) {
				result.push(dataResult);
			});
			dfd.resolve(result);
		});

		return dfd.promise();
	},

	/**
  * Gets an url from a window.open call by mocking the window.open function
  * @param element
  * @returns $.Deferred()
  */
	getPopupURL: function (element) {
		var $ = this.$;
		var document = this.document;
		var window = this.window;
		// override window.open function. we need to execute this in page scope.
		// we need to know how to find this element from page scope.
		var cs = new CssSelector({
			enableSmartTableSelector: false,
			parent: document.body,
			enableResultStripping: false
		});
		var cssSelector = cs.getCssSelector([element]);
		debug(cssSelector);
		debug(document.body.querySelectorAll(cssSelector));
		// this function will catch window.open call and place the requested url as the elements data attribute
		var script = document.createElement('script');
		script.type = 'text/javascript';
		debug(cssSelector);
		debug(document.querySelectorAll(cssSelector));
		var el = document.querySelectorAll(cssSelector)[0];

		const open = window.open;
		window.open = function () {
			var url = arguments[0];
			el.dataset.webScraperExtractUrl = url;
			window.open = open;
		};
		el.click();

		// wait for url to be available
		var deferredURL = jquery.Deferred();
		var timeout = Math.abs(5000 / 30); // 5s timeout to generate an url for popup
		var interval = setInterval(function () {
			var url = $(element).data('web-scraper-extract-url');
			if (url) {
				deferredURL.resolve(url);
				clearInterval(interval);
				script.remove();
			}
			// timeout popup opening
			if (timeout-- <= 0) {
				clearInterval(interval);
				script.remove();
			}
		}, 30);

		return deferredURL.promise();
	},

	getDataColumns: function () {
		return [this.id, this.id + '-href'];
	},

	getFeatures: function () {
		return ['multiple', 'delay'];
	},

	getItemCSSSelector: function () {
		return '*';
	}
};

module.exports = SelectorPopupLink;

},{"../../assets/jquery.whencallsequentially":2,"debug":29,"jquery-deferred":31}],21:[function(require,module,exports){
var jquery = require('jquery-deferred');

var SelectorTable = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  getTableHeaderColumns: function ($table) {
    var columns = {};
    var $ = this.$;
    var headerRowSelector = this.getTableHeaderRowSelector();
    var $headerRow = $($table).find(headerRowSelector);
    if ($headerRow.length > 0) {
      $headerRow.find('td,th').each(function (i) {
        var header = $(this).text().trim();
        columns[header] = {
          index: i + 1
        };
      });
    }
    return columns;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var $ = this.$;

    var tables = this.getDataElements(parentElement);

    var result = [];
    $(tables).each(function (k, table) {
      var columns = this.getTableHeaderColumns($(table));

      var dataRowSelector = this.getTableDataRowSelector();
      $(table).find(dataRowSelector).each(function (i, row) {
        var data = {};
        this.columns.forEach(function (column) {
          if (column.extract === true) {
            if (columns[column.header] === undefined) {
              data[column.name] = null;
            } else {
              var rowText = $(row).find('>:nth-child(' + columns[column.header].index + ')').text().trim();
              data[column.name] = rowText;
            }
          }
        });
        result.push(data);
      }.bind(this));
    }.bind(this));

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    var dataColumns = [];
    this.columns.forEach(function (column) {
      if (column.extract === true) {
        dataColumns.push(column.name);
      }
    });
    return dataColumns;
  },

  getFeatures: function () {
    return ['multiple', 'columns', 'delay', 'tableDataRowSelector', 'tableHeaderRowSelector'];
  },

  getItemCSSSelector: function () {
    return 'table';
  },

  getTableHeaderRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      if ($table.find('thead tr').length === 1) {
        return 'thead tr';
      } else {
        var $rows = $table.find('thead tr');
        // first row with data
        var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
        return 'thead tr:nth-of-type(' + (rowIndex + 1) + ')';
      }
    } else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr');
      // first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
      return 'tr:nth-of-type(' + (rowIndex + 1) + ')';
    } else {
      return '';
    }
  },

  getTableDataRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      return 'tbody tr';
    } else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr');
      // first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
      return 'tr:nth-of-type(n+' + (rowIndex + 2) + ')';
    } else {
      return '';
    }
  },

  getTableHeaderRowSelector: function () {
    // handle legacy selectors
    if (this.tableHeaderRowSelector === undefined) {
      return 'thead tr';
    } else {
      return this.tableHeaderRowSelector;
    }
  },

  getTableDataRowSelector: function () {
    // handle legacy selectors
    if (this.tableDataRowSelector === undefined) {
      return 'tbody tr';
    } else {
      return this.tableDataRowSelector;
    }
  },

  /**
   * Extract table header column info from html
   * @param html
   */
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    var $headerRowColumns = $table.find(headerRowSelector).find('td,th');

    var columns = [];

    $headerRowColumns.each(function (i, columnEl) {
      var header = $(columnEl).text().trim();
      var name = header;
      if (header.length !== 0) {
        columns.push({
          header: header,
          name: name,
          extract: true
        });
      }
    });
    return columns;
  }
};

module.exports = SelectorTable;

},{"jquery-deferred":31}],22:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorText = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);

    var result = [];
    $(elements).each(function (k, element) {
      var data = {};

      // remove script, style tag contents from text results
      var $element_clone = $(element).clone();
      $element_clone.find('script, style').remove();
      // <br> replace br tags with newlines
      $element_clone.find('br').after('\n');

      var text = $element_clone.text();
      if (this.regex !== undefined && this.regex.length) {
        var matches = text.match(new RegExp(this.regex));
        if (matches !== null) {
          text = matches[0];
        } else {
          text = null;
        }
      }
      data[this.id] = text;

      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      result.push(data);
    }

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay'];
  }
};

module.exports = SelectorText;

},{"jquery-deferred":31}],23:[function(require,module,exports){
var SelectorElement = require('./Selector/SelectorElement');
var SelectorElementAttribute = require('./Selector/SelectorElementAttribute');
var SelectorElementClick = require('./Selector/SelectorElementClick');
var SelectorElementScroll = require('./Selector/SelectorElementScroll');
var SelectorGroup = require('./Selector/SelectorGroup');
var SelectorHTML = require('./Selector/SelectorHTML');
var SelectorImage = require('./Selector/SelectorImage');
var SelectorLink = require('./Selector/SelectorLink');
var SelectorPopupLink = require('./Selector/SelectorPopupLink');
var SelectorTable = require('./Selector/SelectorTable');
var SelectorText = require('./Selector/SelectorText');
var SelectorGoogMapID = require('./Selector/SelectorGoogMapID');
module.exports = {
  SelectorElement,
  SelectorElementAttribute,
  SelectorElementClick,
  SelectorElementScroll,
  SelectorGroup,
  SelectorHTML,
  SelectorImage,
  SelectorLink,
  SelectorPopupLink,
  SelectorTable,
  SelectorText,
  SelectorGoogMapID
};

},{"./Selector/SelectorElement":11,"./Selector/SelectorElementAttribute":12,"./Selector/SelectorElementClick":13,"./Selector/SelectorElementScroll":14,"./Selector/SelectorGoogMapID":15,"./Selector/SelectorGroup":16,"./Selector/SelectorHTML":17,"./Selector/SelectorImage":18,"./Selector/SelectorLink":19,"./Selector/SelectorPopupLink":20,"./Selector/SelectorTable":21,"./Selector/SelectorText":22}],24:[function(require,module,exports){
var Selector = require('./Selector');
var SelectorList = require('./SelectorList');
const debug = require('debug')('web-scraper-headless:sitemap');
var Sitemap = function (sitemapObj, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) {
    console.error('C:\\Users\\User\\Solutions\\web-scraper-chrome_geoblink\\extension\\scripts\\Sitemap.js:23:18:(new Error()).stack', new Error().stack);

    throw new Error("Missing document");
  }
  if (!this.window) throw new Error("Missing window");
  this.initData(sitemapObj);
};

Sitemap.prototype = {
  initData: function (sitemapObj) {
    debug(this);
    for (var key in sitemapObj) {
      debug(key);
      this[key] = sitemapObj[key];
    }
    debug(this);
    var $ = this.$;
    var window = this.window;
    var document = this.document;
    var selectors = this.selectors;
    this.selectors = new SelectorList(this.selectors, { $, window, document });
  },

  /**
   * Returns all selectors or recursively find and return all child selectors of a parent selector.
   * @param parentSelectorId
   * @returns {Array}
   */
  getAllSelectors: function (parentSelectorId) {
    return this.selectors.getAllSelectors(parentSelectorId);
  },

  /**
   * Returns only selectors that are directly under a parent
   * @param parentSelectorId
   * @returns {Array}
   */
  getDirectChildSelectors: function (parentSelectorId) {
    return this.selectors.getDirectChildSelectors(parentSelectorId);
  },

  /**
   * Returns all selector id parameters
   * @returns {Array}
   */
  getSelectorIds: function () {
    var ids = ['_root'];
    this.selectors.forEach(function (selector) {
      ids.push(selector.id);
    });
    return ids;
  },

  /**
   * Returns only selector ids which can have child selectors
   * @returns {Array}
   */
  getPossibleParentSelectorIds: function () {
    var ids = ['_root'];
    this.selectors.forEach(function (selector) {
      if (selector.canHaveChildSelectors()) {
        ids.push(selector.id);
      }
    });
    return ids;
  },

  getStartUrls: function () {
    var startUrls = this.startUrl;
    // single start url
    if (this.startUrl.push === undefined) {
      startUrls = [startUrls];
    }

    var urls = [];
    startUrls.forEach(function (startUrl) {
      // zero padding helper
      var lpad = function (str, length) {
        while (str.length < length) {
          str = '0' + str;
        }
        return str;
      };

      var re = /^(.*?)\[(\d+)\-(\d+)(:(\d+))?\](.*)$/;
      var matches = startUrl.match(re);
      if (matches) {
        var startStr = matches[2];
        var endStr = matches[3];
        var start = parseInt(startStr);
        var end = parseInt(endStr);
        var incremental = 1;
        debug(matches[5]);
        if (matches[5] !== undefined) {
          incremental = parseInt(matches[5]);
        }
        for (var i = start; i <= end; i += incremental) {
          // with zero padding
          if (startStr.length === endStr.length) {
            urls.push(matches[1] + lpad(i.toString(), startStr.length) + matches[6]);
          } else {
            urls.push(matches[1] + i + matches[6]);
          }
        }
        return urls;
      } else {
        urls.push(startUrl);
      }
    });

    return urls;
  },

  updateSelector: function (selector, selectorData) {
    // selector is undefined when creating a new one
    if (selector === undefined) {
      var $ = this.$;
      var document = this.document;
      var window = this.window;
      selector = new Selector(selectorData, { $, window, document });
    }

    // update child selectors
    if (selector.id !== undefined && selector.id !== selectorData.id) {
      this.selectors.forEach(function (currentSelector) {
        currentSelector.renameParentSelector(selector.id, selectorData.id);
      });

      // update cyclic selector
      var pos = selectorData.parentSelectors.indexOf(selector.id);
      if (pos !== -1) {
        selectorData.parentSelectors.splice(pos, 1, selectorData.id);
      }
    }

    selector.updateData(selectorData);

    if (this.getSelectorIds().indexOf(selector.id) === -1) {
      this.selectors.push(selector);
    }
  },
  deleteSelector: function (selectorToDelete) {
    this.selectors.forEach(function (selector) {
      if (selector.hasParentSelector(selectorToDelete.id)) {
        selector.removeParentSelector(selectorToDelete.id);
        if (selector.parentSelectors.length === 0) {
          this.deleteSelector(selector);
        }
      }
    }.bind(this));

    for (var i in this.selectors) {
      if (this.selectors[i].id === selectorToDelete.id) {
        this.selectors.splice(i, 1);
        break;
      }
    }
  },
  getDataTableId: function () {
    return this._id.replace(/\./g, '_');
  },
  exportSitemap: function () {
    var sitemapObj = JSON.parse(JSON.stringify(this));
    delete sitemapObj._rev;
    return JSON.stringify(sitemapObj);
  },
  importSitemap: function (sitemapJSON) {
    var sitemapObj = JSON.parse(sitemapJSON);
    this.initData(sitemapObj);
  },
  // return a list of columns than can be exported
  getDataColumns: function () {
    var columns = [];
    this.selectors.forEach(function (selector) {
      columns = columns.concat(selector.getDataColumns());
    });

    return columns;
  },
  getDataExportCsvBlob: function (data) {
    var window = this.window;
    var columns = this.getDataColumns(),
        delimiter = ';',
        newline = '\n',
        csvData = ['\ufeff']; // utf-8 bom char

    // header
    csvData.push(columns.join(delimiter) + newline);

    // data
    data.forEach(function (row) {
      var rowData = [];
      columns.forEach(function (column) {
        var cellData = row[column];
        if (cellData === undefined) {
          cellData = '';
        } else if (typeof cellData === 'object') {
          cellData = JSON.stringify(cellData);
        }

        rowData.push('"' + cellData.replace(/"/g, '""').trim() + '"');
      });
      csvData.push(rowData.join(delimiter) + newline);
    });

    return new window.Blob(csvData, { type: 'text/csv' });
  },
  getSelectorById: function (selectorId) {
    return this.selectors.getSelectorById(selectorId);
  },
  /**
   * Create full clone of sitemap
   * @returns {Sitemap}
   */
  clone: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var clonedJSON = JSON.parse(JSON.stringify(this));
    var sitemap = new Sitemap(clonedJSON, { $, document, window });
    return sitemap;
  }
};

module.exports = Sitemap;

},{"./Selector":9,"./SelectorList":10,"debug":29}],25:[function(require,module,exports){
var Sitemap = require('./Sitemap');

/**
 * From devtools panel there is no possibility to execute XHR requests. So all requests to a remote CouchDb must be
 * handled through Background page. StoreDevtools is a simply a proxy store
 * @constructor
 */
var StoreDevtools = function (options) {
  this.$ = options.$;
  this.document = options.document;
  this.window = options.window;
  if (!this.$) throw new Error('jquery required');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
};

StoreDevtools.prototype = {
  createSitemap: function (sitemap, callback) {
    var request = {
      createSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };

    chrome.runtime.sendMessage(request, function (callbackFn, originalSitemap, newSitemap) {
      originalSitemap._rev = newSitemap._rev;
      callbackFn(originalSitemap);
    }.bind(this, callback, sitemap));
  },
  saveSitemap: function (sitemap, callback) {
    this.createSitemap(sitemap, callback);
  },
  deleteSitemap: function (sitemap, callback) {
    var request = {
      deleteSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };
    chrome.runtime.sendMessage(request, function (response) {
      callback();
    });
  },
  getAllSitemaps: function (callback) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var request = {
      getAllSitemaps: true
    };

    chrome.runtime.sendMessage(request, function (response) {
      var sitemaps = [];

      for (var i in response) {
        sitemaps.push(new Sitemap(response[i], { $, document, window }));
      }
      callback(sitemaps);
    });
  },
  getSitemapData: function (sitemap, callback) {
    var request = {
      getSitemapData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };

    chrome.runtime.sendMessage(request, function (response) {
      callback(response);
    });
  },
  sitemapExists: function (sitemapId, callback) {
    var request = {
      sitemapExists: true,
      sitemapId: sitemapId
    };

    chrome.runtime.sendMessage(request, function (response) {
      callback(response);
    });
  }
};

module.exports = StoreDevtools;

},{"./Sitemap":24}],26:[function(require,module,exports){
if (typeof globalThis === 'undefined') {
	globalThis = function () {
		if (typeof self !== 'undefined') {
			return self;
		} else if (typeof window !== 'undefined') {
			return window;
		} else {
			return Function('return this')();
		}
	}();
}

if (!globalThis.CssSelector || !globalThis.ElementSelector) {
	globalThis.CssSelector = function CssSelector(options) {

		var me = this;

		// defaults
		this.ignoredTags = ['font', 'b', 'i', 's'];
		this.parent = document;
		this.ignoredClassBase = false;
		this.enableResultStripping = true;
		this.enableSmartTableSelector = false;
		this.ignoredClasses = [];
		this.query = function (selector) {
			return me.parent.querySelectorAll(selector);
		};

		// overrides defaults with options
		for (var i in options) {
			this[i] = options[i];
		}

		// jquery parent selector fix
		if (this.query === window.jQuery) {
			this.query = function (selector) {
				return jQuery(me.parent).find(selector);
			};
		}
	};

	// TODO refactor element selector list into a ~ class
	globalThis.ElementSelector = function ElementSelector(element, ignoredClasses) {

		this.element = element;
		this.isDirectChild = true;
		this.tag = element.localName;

		// nth-of-child(n+1)
		this.indexn = null;
		this.index = 1;
		if (element.parentNode !== undefined) {
			// nth-child
			//this.index = [].indexOf.call(element.parentNode.children, element)+1;

			// nth-of-type
			for (var i = 0; i < element.parentNode.children.length; i++) {
				var child = element.parentNode.children[i];
				if (child === element) {
					break;
				}
				if (child.tagName === element.tagName) {
					this.index++;
				}
			}
		}
		this.id = null;
		if (element.id !== '') {
			if (typeof element.id === 'string') {
				this.id = element.id;
			}
		}

		this.classes = new Array();
		for (var i = 0; i < element.classList.length; i++) {
			var cclass = element.classList[i];
			if (ignoredClasses.indexOf(cclass) === -1) {
				this.classes.push(cclass);
			}
		}
	};

	globalThis.ElementSelectorList = function ElementSelectorList(CssSelector) {
		this.CssSelector = CssSelector;
	};

	globalThis.ElementSelectorList.prototype = new Array();

	globalThis.ElementSelectorList.prototype.getCssSelector = function () {

		var resultSelectors = [];

		// TDD
		for (var i = 0; i < this.length; i++) {
			var selector = this[i];

			var isFirstSelector = i === this.length - 1;
			var resultSelector = selector.getCssSelector(isFirstSelector);

			if (this.CssSelector.enableSmartTableSelector) {
				if (selector.tag === 'tr') {
					if (selector.element.children.length === 2) {
						if (selector.element.children[0].tagName === 'TD' || selector.element.children[0].tagName === 'TH' || selector.element.children[0].tagName === 'TR') {

							var text = selector.element.children[0].textContent;
							text = text.trim();

							// escape quotes
							text.replace(/(\\*)(')/g, function (x) {
								var l = x.length;
								return l % 2 ? x : x.substring(0, l - 1) + "\\'";
							});
							resultSelector += ":contains('" + text + "')";
						}
					}
				}
			}

			resultSelectors.push(resultSelector);
		}

		var resultCSSSelector = resultSelectors.reverse().join(' ');
		return resultCSSSelector;
	};

	globalThis.ElementSelector.prototype = {

		getCssSelector: function (isFirstSelector) {

			if (isFirstSelector === undefined) {
				isFirstSelector = false;
			}

			var selector = this.tag;
			if (this.id !== null) {
				selector += '#' + this.id;
			}
			if (this.classes.length) {
				for (var i = 0; i < this.classes.length; i++) {
					selector += "." + this.classes[i];
				}
			}
			if (this.index !== null) {
				selector += ':nth-of-type(' + this.index + ')';
			}
			if (this.indexn !== null && this.indexn !== -1) {
				selector += ':nth-of-type(n+' + this.indexn + ')';
			}
			if (this.isDirectChild && isFirstSelector === false) {
				selector = "> " + selector;
			}

			return selector;
		},
		// merges this selector with another one.
		merge: function (mergeSelector) {

			if (this.tag !== mergeSelector.tag) {
				throw "different element selected (tag)";
			}

			if (this.index !== null) {
				if (this.index !== mergeSelector.index) {

					// use indexn only for two elements
					if (this.indexn === null) {
						var indexn = Math.min(mergeSelector.index, this.index);
						if (indexn > 1) {
							this.indexn = Math.min(mergeSelector.index, this.index);
						}
					} else {
						this.indexn = -1;
					}

					this.index = null;
				}
			}

			if (this.isDirectChild === true) {
				this.isDirectChild = mergeSelector.isDirectChild;
			}

			if (this.id !== null) {
				if (this.id !== mergeSelector.id) {
					this.id = null;
				}
			}

			if (this.classes.length !== 0) {
				var classes = new Array();

				for (var i in this.classes) {
					var cclass = this.classes[i];
					if (mergeSelector.classes.indexOf(cclass) !== -1) {
						classes.push(cclass);
					}
				}

				this.classes = classes;
			}
		}
	};

	globalThis.CssSelector.prototype = {
		mergeElementSelectors: function (newSelecors) {

			if (newSelecors.length < 1) {
				throw "No selectors specified";
			} else if (newSelecors.length === 1) {
				return newSelecors[0];
			}

			// check selector total count
			var elementCountInSelector = newSelecors[0].length;
			for (var i = 0; i < newSelecors.length; i++) {
				var selector = newSelecors[i];
				if (selector.length !== elementCountInSelector) {
					throw "Invalid element count in selector";
				}
			}

			// merge selectors
			var resultingElements = newSelecors[0];
			for (var i = 1; i < newSelecors.length; i++) {
				var mergeElements = newSelecors[i];

				for (var j = 0; j < elementCountInSelector; j++) {
					resultingElements[j].merge(mergeElements[j]);
				}
			}
			return resultingElements;
		},
		stripSelector: function (selectors) {

			var cssSeletor = selectors.getCssSelector();
			var baseSelectedElements = this.query(cssSeletor);

			var compareElements = function (elements) {
				if (baseSelectedElements.length !== elements.length) {
					return false;
				}

				for (var j = 0; j < baseSelectedElements.length; j++) {
					if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
						return false;
					}
				}
				return true;
			};
			// strip indexes
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.index !== null) {
					var index = selector.index;
					selector.index = null;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.index = index;
					}
				}
			}

			// strip isDirectChild
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.isDirectChild === true) {
					selector.isDirectChild = false;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.isDirectChild = true;
					}
				}
			}

			// strip ids
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.id !== null) {
					var id = selector.id;
					selector.id = null;
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.id = id;
					}
				}
			}

			// strip classes
			for (var i = 0; i < selectors.length; i++) {
				var selector = selectors[i];
				if (selector.classes.length !== 0) {
					for (var j = selector.classes.length - 1; j > 0; j--) {
						var cclass = selector.classes[j];
						selector.classes.splice(j, 1);
						var cssSeletor = selectors.getCssSelector();
						var newSelectedElements = this.query(cssSeletor);
						// if results doesn't match then undo changes
						if (!compareElements(newSelectedElements)) {
							selector.classes.splice(j, 0, cclass);
						}
					}
				}
			}

			// strip tags
			for (var i = selectors.length - 1; i > 0; i--) {
				var selector = selectors[i];
				selectors.splice(i, 1);
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selectors.splice(i, 0, selector);
				}
			}

			return selectors;
		},
		getElementSelectors: function (elements, top) {
			var elementSelectors = [];

			for (var i = 0; i < elements.length; i++) {
				var element = elements[i];
				var elementSelector = this.getElementSelector(element, top);
				elementSelectors.push(elementSelector);
			}

			return elementSelectors;
		},
		getElementSelector: function (element, top) {

			var elementSelectorList = new ElementSelectorList(this);
			while (true) {
				if (element === this.parent) {
					break;
				} else if (element === undefined || element.tagName === 'body' || element.tagName === 'BODY') {
					throw 'element is not a child of the given parent';
				}
				if (this.isIgnoredTag(element.tagName)) {

					element = element.parentNode;
					continue;
				}
				if (top > 0) {
					top--;
					element = element.parentNode;
					continue;
				}

				var selector = new ElementSelector(element, this.ignoredClasses);
				if (this.isIgnoredTag(element.parentNode.tagName)) {
					selector.isDirectChild = false;
				}

				elementSelectorList.push(selector);
				element = element.parentNode;
			}

			return elementSelectorList;
		},
		getCssSelector: function (elements, top) {

			top = top || 0;

			var enableSmartTableSelector = this.enableSmartTableSelector;
			if (elements.length > 1) {
				this.enableSmartTableSelector = false;
			}

			var elementSelectors = this.getElementSelectors(elements, top);
			var resultSelector = this.mergeElementSelectors(elementSelectors);
			if (this.enableResultStripping) {
				resultSelector = this.stripSelector(resultSelector);
			}

			this.enableSmartTableSelector = enableSmartTableSelector;

			// strip down selector
			return resultSelector.getCssSelector();
		},
		isIgnoredTag: function (tag) {
			return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
		}
	};
}

var CssSelector = globalThis.CssSelector;

// TODO get rid of jquery

/**
 * Only Elements unique will be added to this array
 * @constructor
 */
function UniqueElementList(clickElementUniquenessType, options) {
	var $ = options.$;
	var window = options.window;
	var document = options.document;

	Object.defineProperty(this, '$', {
		value: $,
		enumerable: false
	});
	Object.defineProperty(this, 'window', {
		value: window,
		enumerable: false
	});
	Object.defineProperty(this, 'document', {
		value: document,
		enumerable: false
	});
	if (!this.$) throw new Error('jquery required');
	if (!this.document) {
		throw new Error("Missing document");
	}
	if (!this.window) throw new Error("Missing window");
	this.clickElementUniquenessType = clickElementUniquenessType;
	this.addedElements = {};
}

UniqueElementList.prototype = [];

UniqueElementList.prototype.push = function (element) {
	var $ = this.$;
	var document = this.document;
	var window = this.window;
	if (this.isAdded(element)) {
		return false;
	} else {
		var elementUniqueId = this.getElementUniqueId(element);
		this.addedElements[elementUniqueId] = true;
		Array.prototype.push.call(this, $(element).clone(true)[0]);
		return true;
	}
};

UniqueElementList.prototype.getElementUniqueId = function (element) {
	var $ = this.$;
	var document = this.document;
	var window = this.window;
	if (this.clickElementUniquenessType === 'uniqueText') {
		var elementText = $(element).text().trim();
		return elementText;
	} else if (this.clickElementUniquenessType === 'uniqueHTMLText') {
		var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($(element).eq(0).clone()).html();
		return elementHTML;
	} else if (this.clickElementUniquenessType === 'uniqueHTML') {
		// get element without text
		var $element = $(element).eq(0).clone();

		var removeText = function ($element) {
			$element.contents().filter(function () {
				if (this.nodeType !== 3) {
					removeText($(this));
				}
				return this.nodeType == 3; // Node.TEXT_NODE
			}).remove();
		};
		removeText($element);

		var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($element).html();
		return elementHTML;
	} else if (this.clickElementUniquenessType === 'uniqueCSSSelector') {
		var cs = new CssSelector({
			enableSmartTableSelector: false,
			parent: $('body')[0],
			enableResultStripping: false
		});
		var CSSSelector = cs.getCssSelector([element]);
		return CSSSelector;
	} else {
		throw 'Invalid clickElementUniquenessType ' + this.clickElementUniquenessType;
	}
};

module.exports = UniqueElementList;

UniqueElementList.prototype.isAdded = function (element) {
	var elementUniqueId = this.getElementUniqueId(element);
	var isAdded = elementUniqueId in this.addedElements;
	return isAdded;
};

},{}],27:[function(require,module,exports){
var jquery = require('jquery-deferred');
var BackgroundScript = require('./BackgroundScript');
/**
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @returns BackgroundScript
 */
var getBackgroundScript = function (location) {
  // Handle calls from different places
  if (location === 'BackgroundScript') {
    return BackgroundScript;
  } else if (location === 'DevTools' || location === 'ContentScript') {
    // if called within background script proxy calls to content script
    var backgroundScript = {};

    Object.keys(BackgroundScript).forEach(function (attr) {
      if (typeof BackgroundScript[attr] === 'function') {
        backgroundScript[attr] = function (request) {
          var reqToBackgroundScript = {
            backgroundScriptCall: true,
            fn: attr,
            request: request
          };

          var deferredResponse = jquery.Deferred();

          chrome.runtime.sendMessage(reqToBackgroundScript, function (response) {
            deferredResponse.resolve(response);
          });

          return deferredResponse;
        };
      } else {
        backgroundScript[attr] = BackgroundScript[attr];
      }
    });

    return backgroundScript;
  } else {
    throw new Error('Invalid BackgroundScript initialization - ' + location);
  }
};

module.exports = getBackgroundScript;

},{"./BackgroundScript":4,"jquery-deferred":31}],28:[function(require,module,exports){
var getBackgroundScript = require('./getBackgroundScript');
var ContentScript = require('./ContentScript');
/**
 *
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @param options
 * @returns ContentScript
 */
var getContentScript = function (location) {
  var contentScript;

  // Handle calls from different places
  if (location === 'ContentScript') {
    contentScript = ContentScript;
    contentScript.backgroundScript = getBackgroundScript('ContentScript');
    return contentScript;
  } else if (location === 'BackgroundScript' || location === 'DevTools') {
    var backgroundScript = getBackgroundScript(location);

    // if called within background script proxy calls to content script
    contentScript = {};
    Object.keys(ContentScript).forEach(function (attr) {
      if (typeof ContentScript[attr] === 'function') {
        contentScript[attr] = function (request) {
          var reqToContentScript = {
            contentScriptCall: true,
            fn: attr,
            request: request
          };

          return backgroundScript.executeContentScript(reqToContentScript);
        };
      } else {
        contentScript[attr] = ContentScript[attr];
      }
    });
    contentScript.backgroundScript = backgroundScript;
    return contentScript;
  } else {
    throw new Error('Invalid ContentScript initialization - ' + location);
  }
};

module.exports = getContentScript;

},{"./ContentScript":5,"./getBackgroundScript":27}],29:[function(require,module,exports){
(function (process){(function (){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this)}).call(this,require('_process'))
},{"./debug":30,"_process":36}],30:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  if (name[name.length - 1] === '*') {
    return true;
  }
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":35}],31:[function(require,module,exports){

module.exports = require('./lib/jquery-deferred');
},{"./lib/jquery-deferred":34}],32:[function(require,module,exports){
var jQuery = module.exports = require("./jquery-core.js"),
	core_rspace = /\s+/;
/**
* jQuery Callbacks
*
* Code from: https://github.com/jquery/jquery/blob/master/src/callbacks.js
*
*/


// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


},{"./jquery-core.js":33}],33:[function(require,module,exports){
/**
* jQuery core object.
*
* Worker with jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/core.js
*
*/

var jQuery = module.exports = {
	type: type
	, isArray: isArray
	, isFunction: isFunction
	, isPlainObject: isPlainObject
	, each: each
	, extend: extend
	, noop: function() {}
};

var toString = Object.prototype.toString;

var class2type = {};
// Populate the class2type map
"Boolean Number String Function Array Date RegExp Object".split(" ").forEach(function(name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});


function type( obj ) {
	return obj == null ?
		String( obj ) :
			class2type[ toString.call(obj) ] || "object";
}

function isFunction( obj ) {
	return jQuery.type(obj) === "function";
}

function isArray( obj ) {
	return jQuery.type(obj) === "array";
}

function each( object, callback, args ) {
	var name, i = 0,
	length = object.length,
	isObj = length === undefined || isFunction( object );

	if ( args ) {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.apply( object[ name ], args ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.apply( object[ i++ ], args ) === false ) {
					break;
				}
			}
		}

		// A special, fast, case for the most common use of each
	} else {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
					break;
				}
			}
		}
	}

	return object;
}

function isPlainObject( obj ) {
	// Must be an Object.
	if ( !obj || jQuery.type(obj) !== "object" ) {
		return false;
	}
	return true;
}

function extend() {
	var options, name, src, copy, copyIsArray, clone,
	target = arguments[0] || {},
	i = 1,
	length = arguments.length,
	deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};



},{}],34:[function(require,module,exports){

/*!
* jquery-deferred
* Copyright(c) 2011 Hidden <zzdhidden@gmail.com>
* MIT Licensed
*/

/**
* Library version.
*/

var jQuery = module.exports = require("./jquery-callbacks.js"),
	core_slice = Array.prototype.slice;

/**
* jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/deferred.js
* Doc: http://api.jquery.com/category/deferred-object/
*
*/

jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});

},{"./jquery-callbacks.js":32}],35:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],36:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],37:[function(require,module,exports){
(function (global){(function (){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],38:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],39:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],40:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":38,"./encode":39}],41:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":42,"punycode":37,"querystring":40}],42:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}]},{},[3])(3)
});
