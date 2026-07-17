/**
 * LeafJS v2.2.2 新增功能集成
 * 包含: hitThrough (穿透选择)、forceUpdate() 增强、motionVertical (运动路径垂直对齐)
 */

import type { IUI } from 'leafer'

/**
 * 穿透选择配置
 * 允许点击穿透某些图层元素选中下层元素
 * 适用于遮盖层、透明层等场景
 */
export interface IHitThroughConfig {
    /** 是否启用穿透选择 */
    enabled: boolean
    /** 穿透的元素类型/tag列表 */
    throughTags?: string[]
    /** 穿透的元素className列表 */
    throughClasses?: string[]
}

/**
 * 强制更新模式
 * 不同更新类型可避免不必要的属性变化事件
 */
export type ForceUpdateType = 'all' | 'render' | 'layout' | 'style'

/**
 * 运动路径垂直配置
 * 支持元素沿竖向路径排列和对齐
 */
export interface IMotionVerticalConfig {
    /** 是否启用垂直对齐 */
    enabled: boolean
    /** 垂直旋转角度 */
    rotation?: number
    /** 垂直对齐方式: 'top' | 'center' | 'bottom' */
    align?: 'top' | 'center' | 'bottom'
    /** 垂直偏移量 */
    offset?: number
}

/**
 * 应用穿透选择配置到元素
 * @param element 目标元素
 * @param config 穿透配置
 */
export function applyHitThrough(element: IUI, config: IHitThroughConfig): void {
    if (!config.enabled) {
        element.hitThrough = false
        return
    }

    // 启用穿透选择，允许点击穿透此元素选中背后的元素
    element.hitThrough = true
}

/**
 * 禁用元素穿透选择
 * @param element 目标元素
 */
export function disableHitThrough(element: IUI): void {
    element.hitThrough = false
}

/**
 * 强制更新元素（优化版）
 * 可选择特定更新类型，避免不必要的属性变化事件派发
 * @param element 目标元素
 * @param updateType 更新类型: 'all'(完整更新) | 'render'(仅渲染) | 'layout'(仅布局) | 'style'(仅样式)
 */
export function forceElementUpdate(
    element: IUI,
    updateType: ForceUpdateType = 'all'
): void {
    if (!element || typeof element.forceUpdate !== 'function') {
        console.warn('[LeafJS v2.2] forceUpdate method not available')
        return
    }

    if (updateType === 'all') {
        // 完整更新（传统方式）
        element.forceUpdate?.()
    } else {
        // 新增：三种优化更新方式，不触发属性变化事件
        element.forceUpdate?.(updateType)
    }
}

/**
 * 应用运动路径垂直对齐配置
 * 支持元素沿竖向路径排列和对齐
 * @param element 目标元素
 * @param config 垂直对齐配置
 */
export function applyMotionVertical(
    element: IUI,
    config: IMotionVerticalConfig
): void {
    if (!config.enabled || !element.motionPath) {
        return
    }

    // 配置垂直对齐（新增功能）
    const motionVertical = {
        rotation: config.rotation ?? 0,
        align: config.align ?? 'center',
        offset: config.offset ?? 0,
    }

    // @ts-ignore - v2.2.2 新增属性
    element.motionVertical = motionVertical
}

/**
 * 批量应用穿透选择配置
 * 适用于多个图层元素
 * @param elements 元素数组
 * @param config 穿透配置
 */
export function applyHitThroughBatch(
    elements: IUI[],
    config: IHitThroughConfig
): void {
    elements.forEach((el) => {
        applyHitThrough(el, config)
    })
}

/**
 * 批量强制更新（性能优化）
 * @param elements 元素数组
 * @param updateType 更新类型
 */
export function forceElementUpdateBatch(
    elements: IUI[],
    updateType: ForceUpdateType = 'render'
): void {
    elements.forEach((el) => {
        forceElementUpdate(el, updateType)
    })
}

/**
 * 创建穿透选择层配置
 * 用于遮盖层、辅助层等不需要直接交互的元素
 */
export function createHitThroughLayer(): IHitThroughConfig {
    return {
        enabled: true,
        throughTags: ['mask', 'overlay', 'guide'],
        throughClasses: ['hit-through', 'overlay-layer'],
    }
}

/**
 * 创建性能优化的更新策略
 * 频繁更新时可避免不必要的事件派发
 */
export function createOptimizedUpdateStrategy() {
    return {
        /** 仅渲染更新，性能最优 */
        renderOnly: () => 'render' as ForceUpdateType,
        /** 仅布局更新 */
        layoutOnly: () => 'layout' as ForceUpdateType,
        /** 仅样式更新 */
        styleOnly: () => 'style' as ForceUpdateType,
    }
}
