function bind (root, initialData) {
  const bindings = []

  const data = new Proxy(initialData, {
    has (obj, prop) {
      // because the with keyword test if property exists
      return typeof prop === 'string' && !prop.match(/^__.*__$/)
    },
    get (obj, prop) {
      return obj[prop] ?? ''
    },
    set (obj, prop, value) {
      obj[prop] = value
      bindings.forEach(binding => binding())
    }
  })
      
  const ELEMENT_NODE = 1
  const TEXT_NODE = 3

  function bindNodeValue (node, context) {
    const parsed = node.nodeValue.split(/{{((?:[^}]|}[^}])*)}}/)
    if (parsed.length > 1) {
      const code = `
        return function () {
        with (__data__) {
          with (__context__) {
            __node__.nodeValue = [__PARSED__].join('')
          }
        }
      }`.replace('__PARSED__', parsed.map((expr, idx) => idx % 2 ? expr : `\`${expr}\``).join(','))
      bindings.push(new Function('__node__', '__data__', '__context__', code)(node, data, context))
    }
  }
    
  function walk (node, context) {
    if (node.nodeType === TEXT_NODE) {
      bindNodeValue(node, context)
    }
    if (node.nodeType === ELEMENT_NODE) {
      const attributes = node.getAttributeNames()
    //   let subContext
    //   if (attributes.includes('{{for}}')) {
    //     subContext = 
    //   } else {
    //     subContext = context
    //   }
      attributes.forEach(name => {
        const att = node.getAttributeNode(name)
        bindNodeValue(att, context)
      });
      [].slice.call(node.childNodes).forEach(child => walk(child, context))
    }
  }
  walk(root, {})

  return data
}

const data = bind(document.body, {})

data.date = new Date()
data.dateColor = 'gray'
data.temps = [19, 19, 19, 19, 19, 19.5, 19.5, 20, 20, 20.5, 20.5, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 20.5, 20]