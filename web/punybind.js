export async function punybind (root, initialData) {
  // const isCSPon = (function () {
  //   try {
  //     new Function('return 0')
  //     return false
  //   } catch (e) {
  //     return true
  //   }
  // }())

  async function compile (source, ...params) {
    return new Function(...params, `return function(${params.join(',')}) { ${source} }`)() //eslint-disable-line
  }

  const bindings = []

  function refresh (force = false) {
    function debounced () {
      if (refresh.timeout) {
        clearTimeout(refresh.timeout)
        delete refresh.timeout
      }
      const changes = []
      bindings.forEach(binding => binding(changes))
      if (changes.length) {
        changes.forEach(change => change())
      }
    }

    if (force) {
      debounced()
    } else if (!refresh.timeout) {
      refresh.timeout = setTimeout(debounced, 0)
    }
  }

  function observe (object) {
    return new Proxy(object, {
      get (obj, prop) {
        const value = obj[prop] ?? ''
        const type = typeof value
        if (type === 'function') {
          const before = JSON.stringify(obj)
          return function () {
            const result = value.apply(obj, arguments)
            if (JSON.stringify(obj) !== before) {
              refresh()
            }
            return result
          }
        }
        if (type === 'object') {
          return observe(value)
        }
        return value
      },
      set (obj, prop, value) {
        const previousValue = obj[prop]
        if (previousValue !== value) {
          obj[prop] = value
          refresh()
        }
        return true
      }
    })
  }

  const data = observe(initialData)

  const ELEMENT_NODE = 1
  const TEXT_NODE = 3

  async function bindNodeValue (node, context) {
    const parsed = node.nodeValue.split(/{{((?:[^}]|}[^}])*)}}/)
    if (parsed.length > 1) {
      const expression = await compile(`with (__context__) { return [
        ${parsed.map((expr, idx) => idx % 2 ? expr : `\`${expr}\``).join(',')}
      ].join('') }`, '__context__')
      let previousValue
      function refreshNodeValue (changes) {
        let value
        try {
          value = expression(context)
        } catch (e) {
          value = ''
        }
        if (value !== previousValue) {
          previousValue = value
          changes.push(() => { node.nodeValue = value })
        }
      }
      bindings.push(refreshNodeValue)
    }
  }

  function bindIterator (template) {
    // bindings.push(iterate.bind(null, template))
  }

  async function parse (node, context) {
    const promises = []
    if (node.nodeType === TEXT_NODE) {
      promises.push(bindNodeValue(node, context))
    }
    if (node.nodeType === ELEMENT_NODE) {
      const attributes = node.getAttributeNames()
      promises.push(...attributes
        .filter(name => !name.match(/^{{\w+}}$/))
        .map(name => bindNodeValue(node.getAttributeNode(name), context))
      )
      if (attributes.includes('{{for}}')) {
        const template = node.ownerDocument.createElement('template')
        node.parentNode.insertBefore(template, node)
        template.appendChild(node)
        promises.push(bindIterator(template))
      }
      promises.push(...[].slice.call(node.childNodes).map(child => parse(child, context)))
    }
    return await Promise.all(promises)
  }
  await parse(root, data)

  refresh()

  return data
}
