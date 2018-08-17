// @flow

import type {Node, NodeID, Graph} from '../../analysis/graph'

import * as React from 'react'
import classNames from 'classnames'
import {createSelector} from 'reselect'
import {withStyles} from '@material-ui/core'

import {getNodes, getAllNodes} from '../../analysis/graph'
import GraphExplorer from './GraphExplorer'
import NodeName from './NodeName'
import {
  getDeepNodeParents,
  keepOnlyEntryModules,
  keepOnlyLeafModules,
} from '../../analysis/dependencies'

type Props = {|
  baseGraph: Graph,
  graph: Graph,
  fromNode: ?Node,
  toNode: ?Node,
  onNodeSelect: NodeID => void,

  className?: string,
  classes: Object,
|}

const styles = {
  root: {},
}

class ParentsExplorer extends React.PureComponent<Props> {
  allNodesSelector = createSelector((_, p) => p.graph, graph => getAllNodes(graph))
  getAllNodes = () => this.allNodesSelector(this.state, this.props)

  entryNodesSelector = createSelector(
    (_, p) => p.graph,
    graph => keepOnlyEntryModules(graph, getAllNodes(graph)),
  )
  getEntryNodes = () => this.entryNodesSelector(this.state, this.props)

  leafNodesSelector = createSelector(
    (_, p) => p.graph,
    graph => keepOnlyLeafModules(graph, getAllNodes(graph)),
  )
  getLeafNodes = () => this.leafNodesSelector(this.state, this.props)

  directParentNodesSelector = createSelector(
    (_, p) => p.graph,
    (_, p) => p.fromNode,
    (graph, fromNode) => {
      if (!fromNode) return []
      return getNodes(graph, fromNode.parents)
    },
  )
  getDirectParentNodes = () => this.directParentNodesSelector(this.state, this.props)

  parentNodesSelector = createSelector(
    (_, p) => p.graph,
    (_, p) => p.toNode,
    (graph, toNode) => {
      if (!toNode) return []
      return getDeepNodeParents(graph, toNode).then(ids => getNodes(graph, ids))
    },
  )
  getParentNodes = () => this.parentNodesSelector(this.state, this.props)

  parentEntryNodesSelector = createSelector(
    (_, p) => p.graph,
    this.parentNodesSelector,
    async (graph, nodes) => {
      return keepOnlyEntryModules(graph, await nodes)
    },
  )
  getParentEntryNodes = () => this.parentEntryNodesSelector(this.state, this.props)

  modes = {
    all: {
      getNodes: this.getAllNodes,
      renderTitle: () => 'All Nodes',
      renderInfo: () => 'Select node to start from',
      renderEmpty: () => 'Nothing found',
    },
    directParents: {
      getNodes: this.getDirectParentNodes,
      renderTitle: () => 'Direct Parents',
      renderInfo: () => {
        const {fromNode} = this.props
        if (!fromNode) return null
        return (
          <>
            Move up to direct parents of <NodeName node={fromNode} />
          </>
        )
      },
      renderEmpty: () => 'No parents found',
    },
    parents: {
      getNodes: this.getParentNodes,
      renderTitle: () => 'All Parents',
      renderInfo: () => {
        const {toNode} = this.props
        if (!toNode) return null
        return (
          <>
            Move up to parents of <NodeName node={toNode} />
          </>
        )
      },
      renderEmpty: () => 'No parents found',
    },
    parentEntries: {
      getNodes: this.getParentEntryNodes,
      renderTitle: () => 'Parent Entry Points',
      renderInfo: () => {
        const {toNode} = this.props
        if (!toNode) return null
        return (
          <>
            Move up to parent entries of <NodeName node={toNode} />
          </>
        )
      },
      renderEmpty: () => 'No entries found',
    },
    entries: {
      getNodes: this.getEntryNodes,
      renderTitle: () => 'Entry Modules',
      renderInfo: () => 'Select entry module to start from',
      renderEmpty: () => 'No modules found',
    },
  }

  initialModes = {
    initialAll: this.modes.all,
    initialEntries: this.modes.entries,
    initialLeafs: {
      getNodes: this.getLeafNodes,
      renderTitle: () => 'Leaf Modules',
      renderInfo: () => 'Select modules without children',
      renderEmpty: () => 'No modules found',
    },
  }

  render() {
    // const {} = this.state
    const {classes, className, fromNode, toNode, baseGraph, graph, onNodeSelect} = this.props

    return (
      <GraphExplorer
        className={classNames(classes.root, className)}
        modes={fromNode && toNode ? this.modes : this.initialModes}
        defaultMode={fromNode && toNode ? 'parents' : 'initialAll'}
        baseGraph={baseGraph}
        graph={graph}
        onNodeSelect={onNodeSelect}
        selected={fromNode}
      />
    )
  }
}

export default withStyles(styles)(ParentsExplorer)
