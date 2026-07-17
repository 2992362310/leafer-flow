/**
 * 图层面板穿透选择集成
 * 支持 LeafJS v2.2.2 的 hitThrough 功能
 * 允许在图层树中穿透某些图层选择下层元素
 */

import type { IUI } from 'leafer'
import { applyHitThrough, disableHitThrough, type IHitThroughConfig } from './leafer-v2-2-features'

/**
 * 图层面板配置
 */
export interface ILayerPanelConfig {
    /** 是否启用穿透选择 */
    enableHitThrough: boolean
    /** 穿透选择的图层类型 */
    throughLayerTypes: string[]
    /** 穿透选择时的提示文本 */
    throughLayerTip: string
}

/**
 * 默认图层面板配置
 */
export const DEFAULT_LAYER_PANEL_CONFIG: ILayerPanelConfig = {
    enableHitThrough: true,
    throughLayerTypes: ['guide', 'overlay', 'annotation', 'mask'],
    throughLayerTip: '穿透选择模式已启用 (可穿透此图层选中下层元素)',
}

/**
 * 图层树穿透选择管理器
 */
export class LayerPanelHitThroughManager {
    private config: ILayerPanelConfig
    private throughLayers: Map<IUI, boolean> = new Map()

    constructor(config: ILayerPanelConfig = DEFAULT_LAYER_PANEL_CONFIG) {
        this.config = config
    }

    /**
     * 为图层启用穿透选择
     * @param layer 目标图层元素
     * @param layerType 图层类型标识
     */
    enableLayerHitThrough(layer: IUI, layerType: string): void {
        if (!this.config.enableHitThrough || !this.config.throughLayerTypes.includes(layerType)) {
            return
        }

        applyHitThrough(layer, {
            enabled: true,
            throughTags: [layerType],
        })

        this.throughLayers.set(layer, true)
    }

    /**
     * 为图层禁用穿透选择
     * @param layer 目标图层元素
     */
    disableLayerHitThrough(layer: IUI): void {
        disableHitThrough(layer)
        this.throughLayers.delete(layer)
    }

    /**
     * 切换图层穿透选择状态
     * @param layer 目标图层元素
     * @param layerType 图层类型
     */
    toggleLayerHitThrough(layer: IUI, layerType: string): void {
        const isEnabled = this.throughLayers.get(layer) ?? false

        if (isEnabled) {
            this.disableLayerHitThrough(layer)
        } else {
            this.enableLayerHitThrough(layer, layerType)
        }
    }

    /**
     * 判断图层是否启用了穿透选择
     * @param layer 目标图层元素
     */
    isHitThroughEnabled(layer: IUI): boolean {
        return this.throughLayers.get(layer) ?? false
    }

    /**
     * 批量为多个图层启用穿透选择
     * @param layers 图层元素数组
     * @param layerType 图层类型
     */
    enableBatchLayerHitThrough(layers: IUI[], layerType: string): void {
        layers.forEach((layer) => {
            this.enableLayerHitThrough(layer, layerType)
        })
    }

    /**
     * 获取所有启用穿透选择的图层
     */
    getHitThroughLayers(): IUI[] {
        return Array.from(this.throughLayers.entries())
            .filter(([, enabled]) => enabled)
            .map(([layer]) => layer)
    }

    /**
     * 清除所有穿透选择配置
     */
    clearAllHitThrough(): void {
        this.throughLayers.forEach((_, layer) => {
            disableHitThrough(layer)
        })
        this.throughLayers.clear()
    }

    /**
     * 获取配置
     */
    getConfig(): ILayerPanelConfig {
        return this.config
    }

    /**
     * 更新配置
     */
    updateConfig(config: Partial<ILayerPanelConfig>): void {
        this.config = { ...this.config, ...config }
    }
}

/**
 * 创建默认的图层穿透选择管理器实例
 */
export function createDefaultLayerHitThroughManager(): LayerPanelHitThroughManager {
    return new LayerPanelHitThroughManager(DEFAULT_LAYER_PANEL_CONFIG)
}
