/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var sprintf = require('./sprintf').sprintf;

function merge(a, b) {
  var c = {}, attrname;

  for (attrname in a) {
    if (a.hasOwnProperty(attrname)) {
      c[attrname] = a[attrname];
    }
  }
  for (attrname in b) {
    if (b.hasOwnProperty(attrname)) {
      c[attrname] = b[attrname];
    }
  }
  return c;
};

var element_ids = 0;

function Element(tag, attrib)
{
  this._id = element_ids++;
  this.tag = tag;
  this.attrib = {};
  this.text = null;
  this.tail = null;
  this._children = [];

  if (attrib) {
    this.attrib = merge(this.attrib, attrib);
  }
}

Element.prototype.toString = function() 
{
  return sprintf("<Element %s at %s>", this.tag, this._id)
};

Element.prototype.makeelement = function(tag, attrib)
{
  return new Element(tag, attrib);
};

Element.prototype.len = function()
{
  return this._children.length;
};

Element.prototype.getItem = function(index)
{
  return this._children[index];
};

Element.prototype.setItem = function(index, element)
{
  this._children[index] = element;
};

Element.prototype.delItem = function(index)
{
  this._children.splice(index, 1);
};

Element.prototype.getSlice = function(start, stop)
{
  return this._children.slice(start, stop);
};

Element.prototype.setSlice = function(start, stop, elements)
{
  var i;
  var k = 0;
  for (i = start; i < stop; i++, k++) {
    this._children[i] = elements[k];
  }
  return rv;
};

Element.prototype.delSlice = function(start, stop)
{
  this._children.splice(start, stop - start);
};

Element.prototype.append = function(element)
{
  this._children.push(element);
};

Element.prototype.extend = function(elements)
{
  this._children.concat(elements);
};

Element.prototype.insert = function(index, element)
{
  this._children[index] = element;
};

Element.prototype.remove = function(index, element)
{
  this._children = this._children.filter(function(e) {
    /* TODO: is this the right way to do this? */
    if (e._id == element._id) {
      return false;
    }
    return true;
  });
};


Element.prototype.find = function(path)
{
  throw new Error('element.find not implemented');
};

Element.prototype.findtext = function(path, defvalue)
{
  throw new Error('element.findtext not implemented');
};

Element.prototype.findall = function(path, defvalue)
{
  throw new Error('element.findall not implemented');
};

Element.prototype.clear = function()
{
  this.attrib = {};
  this._children = [];
  this.text = null;
  this.tail = null;
};

Element.prototype.get = function(key, defvalue)
{
  if (this.attrib[key] !== undefined) {
    return this.attrib[key];
  }
  else {
    return defvalue;
  }
};

Element.prototype.set = function(key, value)
{
  this.attrib[key] = value;
};

Element.prototype.keys = function()
{
  return Object.keys(this.attrib);
};

Element.prototype.items = function()
{
  var rv = [];
  for (var k in this.attrib) {
    if (this.attrib.hasOwnProperty(k)) {
      rv.push([k, this.attrib[k]]);
    }
  }
  return rv;
};

/*
 * In python this uses a generator, but in v8 we don't have em,
 * so we use a callback instead.
 **/
Element.prototype.iter = function(tag, callback)
{
  var self = this;
  var i, child;

  if (tag == "*") {
    tag = null;
  }

  if (tag === null || this.tag == tag) {
    callback(self);
  }

  for (i = 0; i < this._children.length; i++) {
    child = this._children[i];
    child.iter(tag, function(e) {
      callback(e);
    });
  }
};

Element.prototype.itertext = function(callback)
{
  this.iter(null, function(e) {
    if (e.text) {
      callback(e.text);
    }

    if (e.tail) {
      callback(e.tail);
    }
  })
};


function SubElement(parent, tag, attrib) {
  element = parent.makeelement(tag, attrib);
  parent.append(element);
  return element;
};

exports.SubElement = SubElement;

exports.Element = function(tag, attrib) {
  return new Element(tag, attrib);
};

function Comment(text) {
  var element = new Element(Comment);
  if (text) {
    element.text = text;
  }
  return element;
};

function ProcessingInstruction(target, text)
{
  var element = new Element(ProcessingInstruction);
  element.text = target;
  if (text) {
    element.text = element.text + " " + text;
  }
  return element;
}

exports.PI = ProcessingInstruction;
exports.ProcessingInstruction = ProcessingInstruction;

function QName(text_or_uri, tag)
{
  if (tag) {
    text_or_uri = sprintf("{%s}%s", text_or_uri, tag)
  }
  this.text = text_or_uri;
};

function ElementTree(element)
{
  this._root = element;
};

ElementTree.prototype.getroot = function() {
  return this._root;
};

ElementTree.prototype._setroot = function(element) {
  this._root = element;
};

ElementTree.prototype.parse = function(source, parser) {
  if (!parser) {
    parser = new XMLParser(new TreeBuilder());
  }
  parser.feed(source);
  this._root = parser.close();
  return this._root;
};

ElementTree.prototype.iter = function(tag, callback) {
  this._root.iter(tag, callback);
};

ElementTree.prototype.find = function(path) {
  return this._root.find(path);
};

ElementTree.prototype.findtext = function(path, defvalue) {
  return this._root.findtext(path, defvalue);
};

ElementTree.prototype.findall = function(path) {
  return this._root.findall(path);
};

/**
 * Unlike ElementTree, we don't write to a file, we return you a string. 
 */
ElementTree.prototype.write = function(options) {
  var sb = [];
  options = merge({
    encoding: 'utf-8',
    xml_declaration: null,
    default_namespace: null,
    method: 'xml'}, options);

  if (options.xml_declaration !== false) {
    sb.push("<?xml version='1.0' encoding='"+options.encoding +"'?>\n")
  }

  if (options.method == "text") {
    _serialize_text(sb, self._root, encoding);
  }
  else {
    var qnames, namespaces;
    var x = _namespaces(this._root, options.encoding, options.default_namespace);
    qnames = x[0];
    namespaces = x[1];

    if (options.method == "xml") {
      _serialize_xml(function(data) {
        sb.push(data);
      }, this._root, options.encoding, qnames, namespaces);
    }
    else {
      /* TODO: html */
      throw new Error("unknown serialization method "+ options.method);
    }
  }

  return sb.join("");
};

var _namespace_map = {
    /* "well-known" namespace prefixes */
    "http://www.w3.org/XML/1998/namespace": "xml",
    "http://www.w3.org/1999/xhtml": "html",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://schemas.xmlsoap.org/wsdl/": "wsdl",
    /* xml schema */
    "http://www.w3.org/2001/XMLSchema": "xs",
    "http://www.w3.org/2001/XMLSchema-instance": "xsi",
    /* dublic core */
    "http://purl.org/dc/elements/1.1/": "dc",
}

/* TODO: benchmark single regex */
function _escape_attrib(text, encoding) {
  /* TODO: handle encoding */
  if (text.indexOf("&") !== -1) {
    text = text.replace("&", "&amp;");
  }
  if (text.indexOf("<") !== -1) {
    text = text.replace("<", "&lt;");
  }
  if (text.indexOf(">") !== -1) {
    text = text.replace(">", "&gt;");
  }
  if (text.indexOf("\"") !== -1) {
    text = text.replace("\"", "&quot;");
  }
  if (text.indexOf("\n") !== -1) {
    text = text.replace("\n", "&#10;");
  }

  return text;
};

function _escape_cdata(text, encoding) {
  /* TODO: handle encoding */
  if (text.indexOf("&") !== -1) {
    text = text.replace("&", "&amp;");
  }
  if (text.indexOf("<") !== -1) {
    text = text.replace("<", "&lt;");
  }
  if (text.indexOf(">") !== -1) {
    text = text.replace(">", "&gt;");
  }

  return text;
};

function _namespaces(elem, encoding, default_namespace) {
  var qnames = {};
  var namespaces = {};

  if (default_namespace) {
    namespaces[default_namespace] = ""
  }

  function add_qname(qname) {
    /* TODO: qname support */
    if (qname[0] == "{") {
      var tmp = qname.substring(1).split("}", 2);
      var uri = tmp[0];
      var tag = tmp[1];
      var prefix = namespaces[uri];
      if (prefix === undefined) {
        prefix = _namespace_map[uri];
        if (prefix === undefined) {
          prefix = "ns" + namespaces.length;
        }
        if (prefix != "xml") {
          namespaces[uri] = prefix;
        }
      }

      if (prefix) {
        qnames[qname] = sprintf("%s:%s", prefix, tag);
      }
      else {
        qnames[qname] = tag;
      }
    }
    else {
      /* TOOD: default namespaces (?) */
      qnames[qname] = qname;
    }
  }


  elem.iter(null, function(e) {
    var i;
    var tag = e.tag;
    var text = e.text;
    var items = e.items();

    if (tag instanceof QName && qnames[tag.text] === undefined) {
      add_qname(tag.text);
    }
    else if (typeof(tag) === "string") {
      add_qname(tag)
    }
    else if (tag !== null && tag != Comment && tag != ProcessingInstruction) {
      throw new Error('Invalid tag type for serialization: '+ tag);
    }

    if (text instanceof QName && qnames[text.text] === undefined) {
      add_qname(text.text);
    }

    items.forEach(function(item) {
      var key = item[0],
          value = item[1];
      if (key instanceof QName) {
        key = key.text;
      }

      if (qnames[key] === undefined) {
        add_qname(key);
      }

      if (value instanceof QName && qnames[value.text] === undefined) {
        add_qname(value.text);
      }
    });
  });
  return [qnames, namespaces]
};

function _serialize_xml(write, elem, encoding, qnames, namespaces) {
  var tag = elem.tag;
  var text = elem.text;
  var items;
  var i;

  if (tag === Comment) {
    write(sprintf("<!--%s-->", _escape_cdata(text, encoding)));
  }
  else if (tag === ProcessingInstruction) {
    write(sprintf("<?%s?>", _escape_cdata(text, encoding)));
  }
  else {
    tag = qnames[tag];
    if (tag === undefined) {
      if (text) {
        write(_escape_cdata(text, encoding));
      }
      elem.iter(function(e) {
        _serialize_xml(write, e, encoding, qnames, null);
      });
    }
    else {
      write("<" + tag);
      items = elem.items();
      items.sort();
      items.forEach(function(item) {
        var k = item[0],
            v = item[1];

          if (k instanceof QName) {
            k = k.text;
          }

          if (v instanceof QName) {
            v = qnames[v.text];
          }
          else {
            v = _escape_attrib(v, encoding)
          }
          write(sprintf(" %s=\"%s\"", qnames[k], v));
      });

      if (namespaces) {
        /* TODO: write xmlns */
      }

      if (text || elem.len()) {
        write(">");
        if (text) {
          write(_escape_cdata(text, encoding))
        }
        elem._children.forEach(function(e) {
          _serialize_xml(write, e, encoding, qnames, null);
        });

        write("</" + tag + ">");
      }
      else {
        write(" />");
      }
    }
  }
};