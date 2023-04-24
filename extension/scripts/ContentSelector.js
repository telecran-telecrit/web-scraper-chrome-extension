var ElementQuery = require('./ElementQuery')
var jquery = require('jquery-deferred')

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
globalThis.CssSelector = function CssSelector (options) {

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
globalThis.ElementSelector = function ElementSelector (element, ignoredClasses) {

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

globalThis.ElementSelectorList = function ElementSelectorList (CssSelector) {
	this.CssSelector = CssSelector;
};

globalThis.ElementSelectorList.prototype = new Array();

globalThis.ElementSelectorList.prototype.getCssSelector = function () {

	var resultSelectors = [];

	// TDD
	for (var i = 0; i < this.length; i++) {
		var selector = this[i];

		var isFirstSelector = i === this.length-1;
		var resultSelector = selector.getCssSelector(isFirstSelector);

		if (this.CssSelector.enableSmartTableSelector) {
			if (selector.tag === 'tr') {
				if (selector.element.children.length === 2) {
					if (selector.element.children[0].tagName === 'TD'
						|| selector.element.children[0].tagName === 'TH'
						|| selector.element.children[0].tagName === 'TR') {

						var text = selector.element.children[0].textContent;
						text = text.trim();

						// escape quotes
						text.replace(/(\\*)(')/g, function (x) {
							var l = x.length;
							return (l % 2) ? x : x.substring(0, l - 1) + "\\'";
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

		if(isFirstSelector === undefined) {
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
		if(this.isDirectChild && isFirstSelector === false) {
			selector = "> "+selector;
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
				}
				else {
					this.indexn = -1;
				}

				this.index = null;
			}
		}

		if(this.isDirectChild === true) {
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
		}
		else if (newSelecors.length === 1) {
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
			}
			else if (element === undefined || element.tagName === 'body'
				|| element.tagName === 'BODY') {
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
			if(this.isIgnoredTag(element.parentNode.tagName)) {
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


const debug = require('debug')('web-scraper-headless:content-selector')
/**
 * @param options.parentCSSSelector	Elements can be only selected within this element
 * @param options.allowedElements	Elements that can only be selected
 * @constructor
 */
var ContentSelector = function (options, moreOptions) {
	// deferred response
  this.deferredCSSSelectorResponse = jquery.Deferred()

  this.allowedElements = options.allowedElements
  this.parentCSSSelector = options.parentCSSSelector.trim()
  this.alert = options.alert || function (txt) { alert(txt) }

  this.$ = moreOptions.$
  this.document = moreOptions.document
  this.window = moreOptions.window
  if (!this.$) throw new Error('Missing jquery in content selector')
  if (!this.document) throw new Error("Missing document")
  if(!this.window) throw new Error("Missing window")
  if (this.parentCSSSelector) {
    this.parent = this.$(this.parentCSSSelector)[0]

		//  handle situation when parent selector not found
    if (this.parent === undefined) {
      this.deferredCSSSelectorResponse.reject('parent selector not found')
      this.alert('Parent element not found!')
    }
  }	else {
    this.parent = this.$('body')[0]
  }
}

ContentSelector.prototype = {

	/**
	 * get css selector selected by the user
	 */
  getCSSSelector: function (request) {
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
			// elements that are selected by the user
      this.selectedElements = []
			// element selected from top
      this.top = 0

			// initialize css selector
      this.initCssSelector(false)

      this.initGUI()
    }

    return this.deferredCSSSelectorResponse.promise()
  },

  getCurrentCSSSelector: function () {
    if (this.selectedElements && this.selectedElements.length > 0) {
      var cssSelector

			// handle special case when parent is selected
      if (this.isParentSelected()) {
        if (this.selectedElements.length === 1) {
          cssSelector = '_parent_'
        } else if (this.$('#-selector-toolbar [name=diferentElementSelection]').prop('checked')) {
          var selectedElements = this.selectedElements.clone()
          selectedElements.splice(selectedElements.indexOf(this.parent), 1)
          cssSelector = '_parent_, ' + this.cssSelector.getCssSelector(selectedElements, this.top)
        } else {
					// will trigger error where multiple selections are not allowed
          cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top)
        }
      }			else {
        cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top)
      }

      return cssSelector
    }
    return ''
  },

  isParentSelected: function () {
    return this.selectedElements.indexOf(this.parent) !== -1
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
      ignoredClasses: [
        '-sitemap-select-item-selected',
        '-sitemap-select-item-hover',
        '-sitemap-parent',
        '-web-scraper-img-on-top',
        '-web-scraper-selection-active'
      ],
      query: this.$
    })
  },

  previewSelector: function (elementCSSSelector) {
    var $ = this.$
    var document = this.document
    var window = this.window
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      this.highlightParent()
      $(ElementQuery(elementCSSSelector, this.parent, {$, document, window})).addClass('-sitemap-select-item-selected')
      this.deferredCSSSelectorResponse.resolve()
    }

    return this.deferredCSSSelectorResponse.promise()
  },

  initGUI: function () {
    var document = this.document
    this.highlightParent()

		// all elements except toolbar
    this.$allElements = this.$(this.allowedElements + ':not(#-selector-toolbar):not(#-selector-toolbar *)', this.parent)
		// allow selecting parent also
    if (this.parent !== document.body) {
      this.$allElements.push(this.parent)
    }

    this.bindElementHighlight()
    this.bindElementSelection()
    this.bindKeyboardSelectionManipulations()
    this.attachToolbar()
    this.bindMultipleGroupCheckbox()
    this.bindMultipleGroupPopupHide()
    this.bindMoveImagesToTop()
  },

  bindElementSelection: function () {
    this.$allElements.bind('click.elementSelector', function (e) {
      var element = e.currentTarget
      if (this.selectedElements.indexOf(element) === -1) {
        this.selectedElements.push(element)
      }
      this.highlightSelectedElements()

			// Cancel all other events
      return false
    }.bind(this))
  },

	/**
	 * Add to select elements the element that is under the mouse
	 */
  selectMouseOverElement: function () {
    var element = this.mouseOverElement
    if (element) {
      this.selectedElements.push(element)
      this.highlightSelectedElements()
    }
  },

  bindElementHighlight: function () {
    var $ = this.$
    $(this.$allElements).bind('mouseover.elementSelector', function (e) {
      var element = e.currentTarget
      this.mouseOverElement = element
      $(element).addClass('-sitemap-select-item-hover')
      return false
    }.bind(this)).bind('mouseout.elementSelector', function (e) {
      var element = e.currentTarget
      this.mouseOverElement = null
      $(element).removeClass('-sitemap-select-item-hover')
      return false
    }.bind(this))
  },

  bindMoveImagesToTop: function () {
    var $ = this.$
    $('body').addClass('-web-scraper-selection-active')

		// do this only when selecting images
    if (this.allowedElements === 'img') {
      $('img').filter(function (i, element) {
        return $(element).css('position') === 'static'
      }).addClass('-web-scraper-img-on-top')
    }
  },

  unbindMoveImagesToTop: function () {
    this.$('body.-web-scraper-selection-active').removeClass('-web-scraper-selection-active')
    this.$('img.-web-scraper-img-on-top').removeClass('-web-scraper-img-on-top')
  },

  selectChild: function () {
    this.top--
    if (this.top < 0) {
      this.top = 0
    }
  },
  selectParent: function () {
    this.top++
  },

	// User with keyboard arrows can select child or paret elements of selected elements.
  bindKeyboardSelectionManipulations: function () {
    var $ = this.$
    var document = this.document
		// check for focus
    var lastFocusStatus
    this.keyPressFocusInterval = setInterval(function () {
      var focus = document.hasFocus()
      if (focus === lastFocusStatus) return
      lastFocusStatus = focus

      $('#-selector-toolbar .key-button').toggleClass('hide', !focus)
      $('#-selector-toolbar .key-events').toggleClass('hide', focus)
    }, 200)

		// Using up/down arrows user can select elements from top of the
		// selected element
    $(document).bind('keydown.selectionManipulation', function (event) {
			// select child C
      if (event.keyCode === 67) {
        this.animateClickedKey($('#-selector-toolbar .key-button-child'))
        this.selectChild()
      }
			// select parent P
      else if (event.keyCode === 80) {
        this.animateClickedKey($('#-selector-toolbar .key-button-parent'))
        this.selectParent()
      }
			// select element
      else if (event.keyCode === 83) {
        this.animateClickedKey($('#-selector-toolbar .key-button-select'))
        this.selectMouseOverElement()
      }

      this.highlightSelectedElements()
    }.bind(this))
  },

  animateClickedKey: function (element) {
    var $ = this.$
    $(element).removeClass('clicked').removeClass('clicked-animation')
    setTimeout(function () {
      $(element).addClass('clicked')
      setTimeout(function () {
        $(element).addClass('clicked-animation')
      }, 100)
    }, 1)
  },

  highlightSelectedElements: function () {
    var $ = this.$
    var document = this.document
    var window = this.window
    try {
      var resultCssSelector = this.getCurrentCSSSelector()

      $('body #-selector-toolbar .selector').text(resultCssSelector)
			// highlight selected elements
      $('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected')
      $(ElementQuery(resultCssSelector, this.parent, {$, document, window})).addClass('-sitemap-select-item-selected')
    } catch (err) {
      if (err === 'found multiple element groups, but allowMultipleSelectors disabled') {
        debug('multiple different element selection disabled')

        this.showMultipleGroupPopup()
				// remove last added element
        this.selectedElements.pop()
        this.highlightSelectedElements()
      }
    }
  },

  showMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', 'display:block !important;')
  },

  hideMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', '')
  },

  bindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').click(this.hideMultipleGroupPopup.bind(this))
  },

  unbindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').unbind('click')
  },

  bindMultipleGroupCheckbox: function () {
    var $ = this.$
    $('#-selector-toolbar [name=diferentElementSelection]').change(function (e) {
      if ($(e.currentTarget).is(':checked')) {
        this.initCssSelector(true)
      } else {
        this.initCssSelector(false)
      }
    }.bind(this))
  },
  unbindMultipleGroupCheckbox: function () {
    this.$('#-selector-toolbar .diferentElementSelection').unbind('change')
  },

  attachToolbar: function () {
    var $ = this.$
    var $toolbar = '<div id="-selector-toolbar">' +
			'<div class="list-item"><div class="selector-container"><div class="selector"></div></div></div>' +
			'<div class="input-group-addon list-item">' +
				'<input type="checkbox" title="Enable different type element selection" name="diferentElementSelection">' +
				'<div class="popover top">' +
				'<div class="close">×</div>' +
				'<div class="arrow"></div>' +
				'<div class="popover-content">' +
				'<div class="txt">' +
				'Different type element selection is disabled. If the element ' +
				'you clicked should also be included then enable this and ' +
				'click on the element again. Usually this is not needed.' +
				'</div>' +
				'</div>' +
				'</div>' +
			'</div>' +
			'<div class="list-item key-events"><div title="Click here to enable key press events for selection">Enable key events</div></div>' +
			'<div class="list-item key-button key-button-select hide" title="Use S key to select element">S</div>' +
			'<div class="list-item key-button key-button-parent hide" title="Use P key to select parent">P</div>' +
			'<div class="list-item key-button key-button-child hide" title="Use C key to select child">C</div>' +
			'<div class="list-item done-selecting-button">Done selecting!</div>' +
			'</div>'
    $('body').append($toolbar)

    $('body #-selector-toolbar .done-selecting-button').click(function () {
      this.selectionFinished()
    }.bind(this))
  },
  highlightParent: function () {
    var $ = this.$
		// do not highlight parent if its the body
    if (!$(this.parent).is('body') && !$(this.parent).is('#webpage')) {
      $(this.parent).addClass('-sitemap-parent')
    }
  },

  unbindElementSelection: function () {
    var $ = this.$
    $(this.$allElements).unbind('click.elementSelector')
		// remove highlighted element classes
    this.unbindElementSelectionHighlight()
  },
  unbindElementSelectionHighlight: function () {
    this.$('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected')
    this.$('.-sitemap-parent').removeClass('-sitemap-parent')
  },
  unbindElementHighlight: function () {
    this.$(this.$allElements).unbind('mouseover.elementSelector')
			.unbind('mouseout.elementSelector')
  },
  unbindKeyboardSelectionMaipulatios: function () {
    this.$(document).unbind('keydown.selectionManipulation')
    clearInterval(this.keyPressFocusInterval)
  },
  removeToolbar: function () {
    this.$('body #-selector-toolbar a').unbind('click')
    this.$('#-selector-toolbar').remove()
  },

	/**
	 * Remove toolbar and unbind events
	 */
  removeGUI: function () {
    this.unbindElementSelection()
    this.unbindElementHighlight()
    this.unbindKeyboardSelectionMaipulatios()
    this.unbindMultipleGroupPopupHide()
    this.unbindMultipleGroupCheckbox()
    this.unbindMoveImagesToTop()
    this.removeToolbar()
  },

  selectionFinished: function () {
    var resultCssSelector = this.getCurrentCSSSelector()

    this.deferredCSSSelectorResponse.resolve({
      CSSSelector: resultCssSelector
    })
  }
}

module.exports = ContentSelector
