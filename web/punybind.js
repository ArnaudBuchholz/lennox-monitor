export function punybind (root, initialData) {
  const bindings = []

  let refreshTimeout

  function doRefresh () {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout)
    }
    const changes = []
    bindings.forEach(binding => binding(changes))
    if (changes.length) {
      changes.forEach(change => change())
    }
  }

  function refresh () {
    if (!refreshTimeout) {
      refreshTimeout = setTimeout(doRefresh, 0)
    }
  }

  const data = new Proxy(initialData, {
    get (obj, prop) {
      return obj[prop] ?? ''
    },
    set (obj, prop, value) {
      obj[prop] = value
      refresh()
      return true
    }
  })

  const ELEMENT_NODE = 1
  const TEXT_NODE = 3

  function bindNodeValue (node, context) {
    const parsed = node.nodeValue.split(/{{((?:[^}]|}[^}])*)}}/)
    if (parsed.length > 1) {
      const code = `
        let __previousValue__
        return function (__changes__) {
          with (__data__) {
            with (__context__) {
              let __value__
              try {
                __value__ = [__PARSED__].join('')
              } catch (e) {
                __value__ = ''
              }
              if (__value__ !== __previousValue__) {
                __previousValue__ = __value__
                __changes__.push(() => { __node__.nodeValue = __value__ })
              }
            }
          }
        }`
        .replace('__PARSED__', parsed.map((expr, idx) => idx % 2 ? expr : `\`${expr}\``).join(','))
      bindings.push(new Function('__node__', '__data__', '__context__', code)(node, data, context))
    }
  }

  function walk (node, context) {
    if (node.nodeType === TEXT_NODE) {
      bindNodeValue(node, context)
    }
    if (node.nodeType === ELEMENT_NODE) {
      const attributes = node.getAttributeNames()
      attributes
        .filter(name => !name.match(/^{{\w+}}$/))
        .forEach(name => {
          const att = node.getAttributeNode(name)
          bindNodeValue(att, context)
        })
      if (attributes.includes('{{for}}')) {
        const template = node.ownerDocument.createElement('template')
        node.parentNode.insertBefore(template, node)
        template.appendChild(node)
      }
      [].slice.call(node.childNodes).forEach(child => walk(child, context))
    }
  }
  walk(root, {})

  refresh()

  return data
}
