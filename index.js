'use strict'

var VOID_TAGS = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr',
  'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track',
  'wbr', '!doctype']

function isArray (thing) {
  return thing !== '[object Array]' && Object.prototype.toString.call(thing) === '[object Array]'
}

function camelToDash (str) {
  return str.replace(/\W+/g, '-')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
}

function removeEmpties (n) {
  return n !== ''
}

// Lifted from the Mithril rewrite
function copy (source) {
  var res = source
  if (isArray(source)) {
    res = Array(source.length)
    for (var i = 0; i < source.length; i++) res[i] = source[i]
  } else if (typeof source === 'object') {
    res = {}
    for (var k in source) res[k] = source[k]
  }
  return res
}

// shameless stolen from https://github.com/punkave/sanitize-html
function escapeHtml (s, replaceDoubleQuote) {
  if (s === 'undefined') {
    s = ''
  }
  if (typeof (s) !== 'string') {
    s = s + ''
  }
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (replaceDoubleQuote) {
    return s.replace(/"/g, '&quot;')
  }
  return s
}

function setHooks (vnode, hooks) {
  if (vnode.attrs && typeof vnode.attrs.oninit === 'function') vnode.attrs.oninit.call(vnode.state, vnode)
  if (typeof vnode.tag !== 'string' && typeof vnode.tag.oninit === 'function') vnode.tag.oninit.call(vnode.state, vnode)

  if (vnode.attrs && typeof vnode.attrs.onremove === 'function') hooks.push(vnode.attrs.onremove.bind(vnode.state, vnode))
  if (typeof vnode.tag !== 'string' && typeof vnode.tag.onremove === 'function') hooks.push(vnode.tag.onremove.bind(vnode.state, vnode))
}

function normalize(vnodes) {
  return isArray(vnodes) ? vnodes : [vnodes]
}

function createAttrString (vnode, escapeAttributeValue) {
  var attrs = vnode.attrs

  if (!attrs || !Object.keys(attrs).length) {
    return ''
  }

  return Object.keys(attrs).map(function (name) {
    var value = attrs[name]
    if (typeof value === 'undefined' || value === null || typeof value === 'function') {
      return
    }
    if (typeof value === 'boolean') {
      return value ? ' ' + name : ''
    }
    if (name === 'style') {
      if (!value) {
        return
      }
      var styles = attrs.style
      if (typeof styles === 'object') {
        styles = Object.keys(styles).map(function (property) {
          return styles[property] !== '' ? [camelToDash(property).toLowerCase(), styles[property]].join(':') : ''
        }).filter(removeEmpties).join(';')
      }
      return styles !== '' ? ' style="' + escapeAttributeValue(styles, true) + '"' : ''
    }

    // Handle SVG <use> tags specially
    if (name === 'href' && vnode.tag === 'use') {
      return ' xlink:href="' + escapeAttributeValue(value, true) + '"'
    }

    return ' ' + (name === 'className' ? 'class' : name) + '="' + escapeAttributeValue(value, true) + '"'
  }).join('')
}

function createChildrenContent (vnode, options, hooks) {
  if (vnode.text != null) {
    return options.escapeString(vnode.text)
  }
  if (isArray(vnode.children) && !vnode.children.length) {
    return ''
  }

  return renderNodes(vnode.children, options, hooks)
}

function render (vnode, options) {
  options = options || {}
  var hooks = []

  var defaultOptions = {
    escapeAttributeValue: escapeHtml,
    escapeString: escapeHtml,
    strict: false
  }

  Object.keys(defaultOptions).forEach(function (key) {
    if (!options.hasOwnProperty(key)) options[key] = defaultOptions[key]
  })

  var result = renderNodes(normalize(vnode), options, hooks)

  hooks.forEach(function (hook) { hook() })

  return result
}

function renderNodes(vnodes, options, hooks) {
  if (isArray(vnodes)) {
    return vnodes.map(function (vnode) { return renderNode(vnode, options, hooks) }).join('')
  }
}

function renderNode (vnode, options, hooks) {
  if (vnode == null) { // TODO add booleans back when they land
    return ''
  }

  // component
  if (typeof vnode.tag === 'object' && vnode.tag.view) {
    vnode.state = copy(vnode.tag)
    setHooks(vnode, hooks)
    return renderNodes(normalize(vnode.tag.view.call(vnode.state, vnode)), options, hooks)
  }

  setHooks(vnode, hooks)

  if (vnode.tag === '<') {
    return '' + vnode.children
  }
  if (vnode.tag === '#') {
    return options.escapeString(vnode.children)
  }
  var children = createChildrenContent(vnode, options, hooks)
  if (vnode.tag === '[') {
    return '' + children
  }
  if (!children && (options.strict || VOID_TAGS.indexOf(vnode.tag.toLowerCase()) >= 0)) {
    return '<' + vnode.tag + createAttrString(vnode, options.escapeAttributeValue) + (options.strict ? '/' : '') + '>'
  }
  return [
    '<', vnode.tag, createAttrString(vnode, options.escapeAttributeValue), '>',
    children,
    '</', vnode.tag, '>'
  ].join('')
}

render.escapeHtml = escapeHtml

module.exports = render
