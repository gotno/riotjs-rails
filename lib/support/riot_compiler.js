var parsers = {
  html: {
    jade: function(html) {
      return require('jade').render(html, {pretty: true})
    }
  },
  css: {},
  js: {
    none: function(js) {
      return js
    },
    livescript: function(js) {
      return require('LiveScript').compile(js, { bare: true, header: false })
    },
    typescript: function(js) {
      return require('typescript-simple')(js)
    },
    es6: function(js) {
      return require('babel').transform(js, { blacklist: ['useStrict'] }).code
    },
    coffee: function(js) {
      return require('coffee-script').compile(js, { bare: true })
    }
  }
}

// fix 913
parsers.js.javascript = parsers.js.none
// 4 the nostalgics
parsers.js.coffeescript = parsers.js.coffee

module.exports = parsers
/**
 * Syntax checker for Riot.js
 */

/*
ANALYZING STEPS:

1. Devide into blocks by line-level analysis
2. Validate Tag file layout
3. TODO: validate Riot template
4. TODO: validate script in tag
5. TODO: validate style in tag
6. TODO: validate js outside
*/

var LINE_TAG = /^<([\w\-]+)>(.*)<\/\1>\s*$/,
  TAG_START = /^<([\w\-]+)\s?([^>]*)>\s*$/,
  TAG_END = /^<\/([\w\-]+)>\s*$/,
  HTML_END_DETECTOR = /<\/([\w\-]+)>\s*$/,
  INVALID_TAG = /^</,
  STYLE_START = /^\s+<style\s?([^>]*)>\s*$/,
  STYLE_END = /^\s+<\/style>\s*$/,
  SCRIPT_START = /^\s+<script\s?([^>]*)>\s*$/,
  SCRIPT_END = /^\s+<\/script>\s*$/

var ERR_TAG_UNMATCH = 'Closing tag unmatch',
  ERR_NO_INDENT = 'Indentation needed within tag definition',
  ERR_INVALID_TAG = 'Invalid tag flagment',
  ERR_TAG_NOT_CLOSED = 'Last tag definition is not closed'

function analyze(source) {
  var mode = 'outside',// outside | tag_start | tag | tag_end | template | script | style
    tag = ''

  var results = source.split('\n').map(function(row, n) {
    var m, err = '', type

    if (m = row.match(TAG_START)) {
      // Custam tag starting
      type = 'tag_start'
      if (mode == 'tag') { err = ERR_NO_INDENT }
      else { tag = m[1]; mode = 'tag' }
    } else if (m = row.match(TAG_END)) {
      // Custam tag ending
      type = 'tag_end'
      if (tag != m[1]) { err = ERR_TAG_UNMATCH }
      else { tag = ''; mode = 'outside' }
    } else if (m = row.match(LINE_TAG)) {
      // Custom line tag
      if (mode == 'tag') { type = mode; err = ERR_NO_INDENT }
      else { type = 'line_tag'; tag = ''; mode = 'outside' }
    } else if (m = row.match(INVALID_TAG)) {
      // Other invalid tags
      if (mode == 'tag') err = ERR_NO_INDENT
        else err = ERR_INVALID_TAG
      type = mode
    } else if (m = row.match(STYLE_START)) {
      // Style starting
      type = 'style_start'; mode = 'style'; block = ''
    } else if (m = row.match(STYLE_END)) {
      // Style ending
      type = 'style_end'; mode = 'tag'; block = ''
    } else if (m = row.match(SCRIPT_START)) {
      // Script starting
      type = 'script_start'; mode = 'script'; block = ''
    } else if (m = row.match(SCRIPT_END)) {
      // Script ending
      type = 'script_end'; mode = 'tag'; block = ''
    } else {
      if (m = row.match(HTML_END_DETECTOR)) type = 'template'
        else type = mode
    }

    return {
      line: 'L' + (n + 1),
      source: row,
      type: type,
      error: err
    }
  })

  results.push({
    line: 'EOF',
    source: '',
    type: 'end_of_file',
    error: (mode == 'outside') ? '' : ERR_TAG_NOT_CLOSED
  })

  // scan backward to detect script block in tag
  for (var t, i = results.length - 1; i <= 0; i--) {
    t = results[i].type
    if (t == 'tag_end') mode = 'script'
      else if (['template', 'style', 'script'].indexOf(t) > -1) mode = 'template'
        else if (t == 'tag') results[i].type = mode
  }

  return results
}

module.exports = analyze
// simple-dom helper

var simpleDom = require('./simple-dom')
var simpleTokenizer = require('./simple-html-tokenizer')

// create `document` to make riot work
if (typeof window == 'undefined') {
  document = new simpleDom.Document()
}

// add `innerHTML` property to simple-dom element
Object.defineProperty(simpleDom.Element.prototype, 'innerHTML', {
  set: function(html) {
    var frag = sdom.parse(html)
    while (this.firstChild) this.removeChild(this.firstChild)
    this.appendChild(frag)
  },
  get: function() {
    return this.firstChild ? sdom.serialize(this.firstChild) : ''
  }
})

// add `outerHTML` property to simple-dom element
Object.defineProperty(simpleDom.Element.prototype, 'outerHTML', {
  get: function() {
    var html = sdom.serialize(this)
    var rxstr = '^(<' + this.tagName + '>.*?</' + this.tagName + '>)'
    var match = html.match(new RegExp(rxstr, 'i'))
    return match ? match[0] : html
  }
})

// add `style` property to simple-dom element
Object.defineProperty(simpleDom.Element.prototype, 'style', {
  get: function() {
    var el = this
    return Object.defineProperty({}, 'display', {
      set: function(value) {
        el.setAttribute('style', 'display: ' + value + ';')
      }
    })
  }
})

var sdom = module.exports = {
  parse: function(html) {
    // parse html string to simple-dom document
    var blank = new simpleDom.Document()
    var parser = new simpleDom.HTMLParser(simpleTokenizer.tokenize, blank, simpleDom.voidMap)
    return parser.parse(html)
  },
  serialize: function(doc) {
    // serialize simple-dom document to html string
    var serializer = new simpleDom.HTMLSerializer(simpleDom.voidMap)
    return serializer.serialize(doc)
  }
}
var BOOL_ATTR = ('allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,'+
  'defaultchecked,defaultmuted,defaultselected,defer,disabled,draggable,enabled,formnovalidate,hidden,'+
  'indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,'+
  'pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,spellcheck,translate,truespeed,'+
  'typemustmatch,visible').split(','),
  // these cannot be auto-closed
  VOID_TAGS = 'area,base,br,col,command,embed,hr,img,input,keygen,link,meta,param,source,track,wbr'.split(','),
  /*
    Following attributes give error when parsed on browser with { exrp_values }

    'd' describes the SVG <path>, Chrome gives error if the value is not valid format
    https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
  */
  PREFIX_ATTR = ['style', 'src', 'd'],

  LINE_TAG = /^<([\w\-]+)>(.*)<\/\1>/gim,
  QUOTE = /=({[^}]+})([\s\/\>])/g,
  SET_ATTR = /([\w\-]+)=(["'])([^\2]+?)\2/g,
  EXPR = /{\s*([^}]+)\s*}/g,
  // (tagname) (html) (javascript) endtag
  CUSTOM_TAG = /^<([\w\-]+)\s?([^>]*)>([^\x00]*[\w\/}"']>$)?([^\x00]*?)^<\/\1>/gim,
  SCRIPT = /<script(\s+type=['"]?([^>'"]+)['"]?)?>([^\x00]*?)<\/script>/gm,
  STYLE = /<style(\s+type=['"]?([^>'"]+)['"]?|\s+scoped)?>([^\x00]*?)<\/style>/gm,
  CSS_SELECTOR = /(^|\}|\{)\s*([^\{\}]+)\s*(?=\{)/g,
  CSS_COMMENT = /\/\*[^\x00]*?\*\//gm,
  HTML_COMMENT = /<!--.*?-->/g,
  CLOSED_TAG = /<([\w\-]+)([^>]*)\/\s*>/g,
  LINE_COMMENT = /^\s*\/\/.*$/gm,
  JS_COMMENT = /\/\*[^\x00]*?\*\//gm,
  INPUT_NUMBER = /(<input\s[^>]*?)type=['"]number['"]/gm

function mktag(name, html, css, attrs, js) {
  return 'riot.tag(\''
    + name + '\', \''
    + html + '\''
    + (css ? ', \'' + css + '\'' : '')
    + (attrs ? ', \'' + attrs.replace(/'/g, "\\'") + '\'' : '')
    + ', function(opts) {' + js + '\n});'
}

function compileHTML(html, opts, type) {

  var brackets = riot.util.brackets

  // foo={ bar } --> foo="{ bar }"
  html = html.replace(brackets(QUOTE), '="$1"$2')

  // whitespace
  html = opts.whitespace ? html.replace(/\n/g, '\\n') : html.replace(/\s+/g, ' ')

  // strip comments
  html = html.trim().replace(HTML_COMMENT, '')

  // input type=numbr
  html = html.replace(INPUT_NUMBER, '$1riot-type='+brackets(0)+'"number"'+brackets(1)) // fake expression

  // alter special attribute names
  html = html.replace(SET_ATTR, function(full, name, _, expr) {
    if (expr.indexOf(brackets(0)) >= 0) {
      name = name.toLowerCase()

      if (PREFIX_ATTR.indexOf(name) >= 0) name = 'riot-' + name

      // IE8 looses boolean attr values: `checked={ expr }` --> `__checked={ expr }`
      else if (BOOL_ATTR.indexOf(name) >= 0) name = '__' + name
    }

    return name + '="' + expr + '"'
  })

  // run expressions trough parser
  if (opts.expr) {
    html = html.replace(brackets(EXPR), function(_, expr) {
      var ret = compileJS(expr, opts, type).trim().replace(/\r?\n|\r/g, '').trim()
      if (ret.slice(-1) == ';') ret = ret.slice(0, -1)
      return brackets(0) + ret + brackets(1)
    })
  }

  // <foo/> -> <foo></foo>
  html = html.replace(CLOSED_TAG, function(_, name, attr) {
    var tag = '<' + name + (attr ? ' ' + attr.trim() : '') + '>'

    // Do not self-close HTML5 void tags
    if (VOID_TAGS.indexOf(name.toLowerCase()) == -1) tag += '</' + name + '>'
    return tag
  })

  // escape single quotes
  html = html.replace(/'/g, "\\'")

  // \{ jotain \} --> \\{ jotain \\}
  html = html.replace(brackets(/\\{|\\}/g), '\\$&')

  // compact: no whitespace between tags
  if (opts.compact) html = html.replace(/> </g, '><')

  return html

}


function riotjs(js) {

  // strip comments
  js = js.replace(LINE_COMMENT, '').replace(JS_COMMENT, '')

  // ES6 method signatures
  var lines = js.split('\n'),
      es6Ident = ''

  lines.forEach(function(line, i) {
    var l = line.trim()

    // method start
    if (l[0] != '}' && l.indexOf('(') > 0 && l.indexOf('function') == -1) {
      var end = /[{}]/.exec(l.slice(-1)),
          m = end && /(\s+)([\w]+)\s*\(([\w,\s]*)\)\s*\{/.exec(line)

      if (m && !/^(if|while|switch|for|catch)$/.test(m[2])) {
        lines[i] = m[1] + 'this.' + m[2] + ' = function(' + m[3] + ') {'

        // foo() { }
        if (end[0] == '}') {
          lines[i] += ' ' + l.slice(m[0].length - 1, -1) + '}.bind(this)'

        } else {
          es6Ident = m[1]
        }
      }

    }

    // method end
    if (line.slice(0, es6Ident.length + 1) == es6Ident + '}') {
      lines[i] = es6Ident + '}.bind(this);'
      es6Ident = ''
    }

  })

  return lines.join('\n')

}

function scopedCSS (tag, style, type) {
  return style.replace(CSS_COMMENT, '').replace(CSS_SELECTOR, function (m, p1, p2) {
    return p1 + ' ' + p2.split(/\s*,\s*/g).map(function(sel) {
      var s = sel.trim().replace(/:scope\s*/, '')
      return s[0] == '@' || s == 'from' || s == 'to' || /%$/.test(s) ? s :
        tag + ' ' + s + ', [riot-tag="' + tag + '"] ' + s
    }).join(',')
  }).trim()
}

function compileJS(js, opts, type) {
  var parser = opts.parser || (type ? riot.parsers.js[type] : riotjs)
  if (!parser) throw new Error('Parser not found "' + type + '"')
  return parser(js, opts)
}

function compileTemplate(lang, html) {
  var parser = riot.parsers.html[lang]
  if (!parser) throw new Error('Template parser not found "' + lang + '"')
  return parser(html)
}

function compileCSS(style, tag, type) {
  if (type == 'scoped-css') style = scopedCSS(tag, style)
  else if (riot.parsers.css[type]) style = riot.parsers.css[type](tag, style)
  return style.replace(/\s+/g, ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'").trim()
}

function compile(src, opts) {

  opts = opts || {}

  if (opts.brackets) riot.settings.brackets = opts.brackets

  if (opts.template) src = compileTemplate(opts.template, src)

  src = src.replace(LINE_TAG, function(_, tagName, html) {
    return mktag(tagName, compileHTML(html, opts), '', '', '')
  })

  return src.replace(CUSTOM_TAG, function(_, tagName, attrs, html, js) {
    html = html || ''
    attrs = compileHTML(attrs, '', '')

    // js wrapped inside <script> tag
    var type = opts.type

    if (!js.trim()) {
      html = html.replace(SCRIPT, function(_, fullType, _type, script) {
        if (_type) type = _type.replace('text/', '')
        js = script
        return ''
      })
    }

    // styles in <style> tag
    var styleType = 'css',
        style = ''

    html = html.replace(STYLE, function(_, fullType, _type, _style) {
      if (fullType && fullType.trim() == 'scoped') styleType = 'scoped-css'
        else if (_type) styleType = _type.replace('text/', '')
      style = _style
      return ''
    })

    return mktag(
      tagName,
      compileHTML(html, opts, type),
      compileCSS(style, tagName, styleType),
      attrs,
      compileJS(js, opts, type)
    )

  })

}
var compilerPath = require('path').join(__dirname, '../shared/compiler.js')

global.riot = require(process.env.RIOT || '../../riot')
global.riot.parsers = parsers

// Evaluate the compiler shared functions in this context
/*eslint-disable*/
eval(require('fs').readFileSync(compilerPath, 'utf8'))
/*eslint-enable*/

module.exports = {
  compile: compile,
  html: compileHTML,
  style: compileCSS,
  js: compileJS
}

// allow to require('riot')
var riot = module.exports = require(process.env.RIOT || '../../riot')

// allow to require('riot').compile
riot.compile = require('./compiler').compile

// allow to require('some.tag')
require.extensions['.tag'] = function(module, filename) {
  var src = riot.compile(require('fs').readFileSync(filename, 'utf8'))
  module._compile('module.exports = ' + src, filename)
}

// simple-dom helper
var sdom = require('./sdom')

riot.render = function(tagName, opts) {
  var root = document.createElement(tagName)
  var tag = riot.mount(root, opts)
  return sdom.serialize(root)
}
