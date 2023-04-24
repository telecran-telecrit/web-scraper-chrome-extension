var jquery = require('jquery-deferred')
var UniqueElementList = require('./../UniqueElementList')
var ElementQuery = require('./../ElementQuery')

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

var ElementSelector = globalThis.ElementSelector
var CssSelector = globalThis.CssSelector;


var SelectorElementClick = {

  canReturnMultipleRecords: function () {
    return true
  },

  canHaveChildSelectors: function () {
    return true
  },

  canHaveLocalChildSelectors: function () {
    return true
  },

  canCreateNewJobs: function () {
    return false
  },
  willReturnElements: function () {
    return true
  },

  getClickElements: function (parentElement) {
    var $ = this.$
    var document = this.document
    var window = this.window
    var clickElements = ElementQuery(this.clickElementSelector, parentElement, {$, document, window})
    return clickElements
  },

	/**
	 * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
	 * @param element
	 */
  isElementInHTML: function (element) {
    return this.$(element).closest('html').length !== 0
  },

  triggerButtonClick: function (clickElement) {
    var document = this.document
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: this.$('body')[0],
      enableResultStripping: false
    })
    var cssSelector = cs.getCssSelector([clickElement])

    document.querySelectorAll(cssSelector)[0].click()
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
      return 'uniqueText'
    } else {
      return this.clickElementUniquenessType
    }
  },

  _getData: function (parentElement) {
    var $ = this.$
    var document = this.document
    var window = this.window
    var delay = parseInt(this.delay) || 0
    var deferredResponse = jquery.Deferred()
    var foundElements = new UniqueElementList('uniqueText', {$, document, window})
    var clickElements = this.getClickElements(parentElement)
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType(), {$, document, window})

		// add elements that are available before clicking
    var elements = this.getDataElements(parentElement)
    elements.forEach(foundElements.push.bind(foundElements))

		// discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText', {$, document, window})
    }

		// no elements to click at the beginning
    if (clickElements.length === 0) {
      deferredResponse.resolve(foundElements)
      return deferredResponse.promise()
    }

		// initial click and wait
    var currentClickElement = clickElements[0]
    this.triggerButtonClick(currentClickElement)
    var nextElementSelection = (new Date()).getTime() + delay

		// infinitely scroll down and find all items
    var interval = setInterval(function () {
			// find those click elements that are not in the black list
      var allClickElements = this.getClickElements(parentElement)
      clickElements = []
      allClickElements.forEach(function (element) {
        if (!doneClickingElements.isAdded(element)) {
          clickElements.push(element)
        }
      })

      var now = (new Date()).getTime()
			// sleep. wait when to extract next elements
      if (now < nextElementSelection) {
				// debug("wait");
        return
      }

			// add newly found elements to element foundElements array.
      var elements = this.getDataElements(parentElement)
      var addedAnElement = false
      elements.forEach(function (element) {
        var added = foundElements.push(element)
        if (added) {
          addedAnElement = true
        }
      })
			// debug("added", addedAnElement);

			// no new elements found. Stop clicking this button
      if (!addedAnElement) {
        doneClickingElements.push(currentClickElement)
      }

			// continue clicking and add delay, but if there is nothing
			// more to click the finish
			// debug("total buttons", clickElements.length)
      if (clickElements.length === 0) {
        clearInterval(interval)
        deferredResponse.resolve(foundElements)
      } else {
				// debug("click");
        currentClickElement = clickElements[0]
				// click on elements only once if the type is clickonce
        if (this.clickType === 'clickOnce') {
          doneClickingElements.push(currentClickElement)
        }
        this.triggerButtonClick(currentClickElement)
        nextElementSelection = now + delay
      }
    }.bind(this), 50)

    return deferredResponse.promise()
  },

  getDataColumns: function () {
    return []
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'clickElementSelector', 'clickType', 'discardInitialElements', 'clickElementUniquenessType']
  }
}

module.exports = SelectorElementClick
