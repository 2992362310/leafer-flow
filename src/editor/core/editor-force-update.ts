/**
 * 编辑器强制更新优化集成
 * 支持 LeafJS v2.2.2 的 forceUpdate() 三种更新模式
 * 可优化高频更新场景的性能
 */

import type { IUI } from 'leafer'
import type Editor from '../editor'
import { forceElementUpdate, forceElementUpdateBatch, type ForceUpdateType } from './leafer-v2-2-features'

/**
 * 编辑器更新策略配置
 */
export interface IEditorUpdateStrategy {
    /** 是否启用优化的forceUpdate */
    enableOptimizedUpdate: boolean
    /** 默认更新模式 */
    defaultUpdateType: ForceUpdateType
    /** 高频更新的阈值（ms） */
    frequentUpdateThreshold: number
    /** 是否批量更新时使用优化模式 */
    useBatchOptimization: boolean
}

/**
 * 默认编辑器更新策略
 */
export const DEFAULT_EDITOR_UPDATE_STRATEGY: IEditorUpdateStrategy = {
    enableOptimizedUpdate: true,
    defaultUpdateType: 'render',
    frequentUpdateThreshold: 16, // 16ms ≈ 60fps
    useBatchOptimization: true,
}

/**
 * 编辑器更新性能分析器
 */
export class EditorUpdatePerformanceAnalyzer {
    private lastUpdateTime = 0
    private updateCount = 0
    private frequentUpdateCount = 0
    private metrics = {
        totalUpdates: 0,
        frequentUpdates: 0,
        optimizedUpdates: 0,
        averageUpdateInterval: 0,
    }

    /**
     * 记录更新事件
     * @param updateType 更新类型
     * @param isOptimized 是否为优化更新
     */
    recordUpdate(updateType: ForceUpdateType, isOptimized: boolean): void {
        const now = performance.now()
        const interval = now - this.lastUpdateTime

        this.lastUpdateTime = now
        this.updateCount++
        this.metrics.totalUpdates++

        if (isOptimized) {
            this.metrics.optimizedUpdates++
        }

        if (interval < DEFAULT_EDITOR_UPDATE_STRATEGY.frequentUpdateThreshold) {
            this.frequentUpdateCount++
            this.metrics.frequentUpdates++
        }

        this.metrics.averageUpdateInterval = (this.metrics.averageUpdateInterval + interval) / 2
    }

    /**
     * 获取性能指标
     */
    getMetrics() {
        return {
            ...this.metrics,
            optimizationRate: this.metrics.totalUpdates > 0 ? this.metrics.optimizedUpdates / this.metrics.totalUpdates : 0,
            frequentUpdateRate: this.metrics.totalUpdates > 0 ? this.metrics.frequentUpdates / this.metrics.totalUpdates : 0,
        }
    }

    /**
     * 重置指标
     */
    reset(): void {
        this.updateCount = 0
        this.frequentUpdateCount = 0
        this.metrics = {
            totalUpdates: 0,
            frequentUpdates: 0,
            optimizedUpdates: 0,
            averageUpdateInterval: 0,
        }
    }
}

/**
 * 编辑器强制更新管理器
 */
export class EditorForceUpdateManager {
    private editor: Editor
    private strategy: IEditorUpdateStrategy
    private analyzer: EditorUpdatePerformanceAnalyzer
    private updateQueue: Array<{ element: IUI; updateType: ForceUpdateType }> = []
    private batchUpdateTimer: ReturnType<typeof setTimeout> | null = null

    constructor(editor: Editor, strategy: IEditorUpdateStrategy = DEFAULT_EDITOR_UPDATE_STRATEGY) {
        this.editor = editor
        this.strategy = strategy
        this.analyzer = new EditorUpdatePerformanceAnalyzer()
    }

    /**
     * 强制更新单个元素
     * @param element 元素
     * @param updateType 更新类型（如果为null，则不使用优化更新）
     */
    updateElement(element: IUI, updateType?: ForceUpdateType): void {
        if (!this.strategy.enableOptimizedUpdate || !updateType) {
            element.forceUpdate?.()
            return
        }

        const finalUpdateType = updateType || this.strategy.defaultUpdateType
        forceElementUpdate(element, finalUpdateType)
        this.analyzer.recordUpdate(finalUpdateType, true)
    }

    /**
     * 强制更新多个元素
     * @param elements 元素数组
     * @param updateType 更新类型
     */
    updateElements(elements: IUI[], updateType?: ForceUpdateType): void {
        if (!this.strategy.enableOptimizedUpdate || !updateType || !this.strategy.useBatchOptimization) {
            elements.forEach((el) => el.forceUpdate?.())
            return
        }

        const finalUpdateType = updateType || this.strategy.defaultUpdateType
        forceElementUpdateBatch(elements, finalUpdateType)
        elements.forEach(() => this.analyzer.recordUpdate(finalUpdateType, true))
    }

    /**
     * 队列化批量更新（减少重排）
     * @param element 元素
     * @param updateType 更新类型
     */
    queueUpdate(element: IUI, updateType: ForceUpdateType = 'render'): void {
        this.updateQueue.push({ element, updateType })

        // 清除之前的计时器
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer)
        }

        // 在下一帧执行批量更新
        this.batchUpdateTimer = setTimeout(() => {
            this.flushUpdateQueue()
        }, 0)
    }

    /**
     * 执行更新队列
     */
    private flushUpdateQueue(): void {
        if (this.updateQueue.length === 0) return

        const updateTypeGroups = new Map<ForceUpdateType, IUI[]>()

        // 按更新类型分组
        for (const { element, updateType } of this.updateQueue) {
            if (!updateTypeGroups.has(updateType)) {
                updateTypeGroups.set(updateType, [])
            }
            updateTypeGroups.get(updateType)!.push(element)
        }

        // 按类型批量更新
        for (const [updateType, elements] of updateTypeGroups) {
            this.updateElements(elements, updateType)
        }

        // 清空队列
        this.updateQueue = []
        this.batchUpdateTimer = null
    }

    /**
     * 获取性能指标
     */
    getPerformanceMetrics() {
        return this.analyzer.getMetrics()
    }

    /**
     * 打印性能报告
     */
    printPerformanceReport(): void {
        const metrics = this.getPerformanceMetrics()
        console.group('[LeafJS v2.2] Editor Update Performance')
        console.table(metrics)
        console.log(`优化率: ${(metrics.optimizationRate * 100).toFixed(2)}%`)
        console.log(`高频更新率: ${(metrics.frequentUpdateRate * 100).toFixed(2)}%`)
        console.log(`平均更新间隔: ${metrics.averageUpdateInterval.toFixed(2)}ms`)
        console.groupEnd()
    }

    /**
     * 重置性能分析器
     */
    resetMetrics(): void {
        this.analyzer.reset()
    }

    /**
     * 更新策略配置
     */
    updateStrategy(strategy: Partial<IEditorUpdateStrategy>): void {
        this.strategy = { ...this.strategy, ...strategy }
    }

    /**
     * 获取当前策略
     */
    getStrategy(): IEditorUpdateStrategy {
        return this.strategy
    }
}

/**
 * 选中元素优化更新
 * 适用于编辑器的选择操作
 */
export function optimizeSelectionUpdate(selectedElements: IUI[]): void {
    // 仅渲染更新，不触发属性变化事件
    forceElementUpdateBatch(selectedElements, 'render')
}

/**
 * 拖拽操作优化更新
 * 适用于编辑器的移动/缩放/旋转等变换操作
 */
export function optimizeTransformUpdate(transformElements: IUI[]): void {
    // 布局更新即可，不需要完整重新渲染
    forceElementUpdateBatch(transformElements, 'layout')
}

/**
 * 样式编辑优化更新
 * 适用于编辑器的样式面板修改
 */
export function optimizeStyleUpdate(styledElements: IUI[]): void {
    // 仅样式更新，不影响布局
    forceElementUpdateBatch(styledElements, 'style')
}

/**
 * 创建默认编辑器更新管理器
 */
export function createDefaultEditorUpdateManager(editor: Editor): EditorForceUpdateManager {
    return new EditorForceUpdateManager(editor, DEFAULT_EDITOR_UPDATE_STRATEGY)
}
