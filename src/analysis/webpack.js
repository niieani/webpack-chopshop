// @flow

import {createGraph, addNode, getNodeId, addEdge} from './graph'

import type {Graph} from './graph'

export async function readWebpackStats(
  stats: Object,
  options?: {
    includeAsyncImports?: boolean,
    includeChunks?: boolean,
  } = {},
): Promise<Graph> {
  const graph = createGraph()
  const {includeAsyncImports = false, includeChunks = false} = options

  const {chunks = [], modules = []} = stats

  // create chunks
  if (includeChunks) {
    for (const chunk of chunks) {
      addNode(graph, {
        id: getNodeId('chunk', chunk.id),
        kind: chunk.reason && chunk.reason.indexOf('split chunk') ? 'split-chunk' : 'chunk',
        name: chunk.names[0],
        size: 0,
        original: chunk,
      })
      await graph.idle()
    }
  }

  // create modules
  for (const module of modules) {
    if (module.id == null) {
      // module has been removed at optimization phase (concatenated, tree-shaken, etc)
      continue
    }
    const isConcat = module.name.indexOf(' + ') > 0
    const isNamespace = module.name.indexOf(' namespace object') > 0
    const kind = isConcat ? 'concat' : isNamespace ? 'namespace' : 'module'
    addNode(graph, {
      id: getNodeId('module', module.id),
      kind,
      name: module.name,
      file: isConcat ? undefined : (module.name || '').replace(/^.*!/),
      size: module.size,
      original: module,
    })
    await graph.idle()
  }

  // create edges
  for (const module of modules) {
    if (includeChunks) {
      for (const chunkId of module.chunks) {
        addEdge(graph, {
          from: getNodeId('chunk', chunkId),
          to: getNodeId('module', module.id),
          kind: 'chunk child',
          original: module,
        })
      }
    }
    for (const reason of module.reasons) {
      const type = reason.type || ''
      if (reason.moduleId == null) {
        // reason has been removed at optimization phase (concatenated, tree-shaken, etc)
        continue
      }
      const async = type.indexOf('import()') >= 0 && type.indexOf('eager') < 0
      if (async && includeAsyncImports === false) {
        continue
      }
      addEdge(graph, {
        from: getNodeId('module', reason.moduleId),
        to: getNodeId('module', module.id),
        kind: type,
        name: reason.userRequest,
        async,
        original: reason,
      })
    }
    await graph.idle()
  }
  return graph
}
