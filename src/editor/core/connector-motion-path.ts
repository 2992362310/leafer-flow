/**
 * 连接线运动路径垂直对齐集成
 * 支持 LeafJS v2.2.2 的 motionVertical 功能
 * 支持元素沿竖向路径排列和对齐
 */

import type { IUI } from 'leafer'
import type { IMotionVerticalConfig } from './leafer-v2-2-features'
import { applyMotionVertical } from './leafer-v2-2-features'

/**
 * 连接线运动路径配置
 */
export interface IConnectorMotionPathConfig {
    /** 是否启用运动路径 */
    enabled: boolean
    /** 路径数据 */
    pathData?: string | any[]
    /** 是否启用垂直对齐 */
    enableVertical: boolean
    /** 垂直对齐配置 */
    verticalConfig: IMotionVerticalConfig
}

/**
 * 默认连接线运动路径配置
 */
export const DEFAULT_CONNECTOR_MOTION_CONFIG: IConnectorMotionPathConfig = {
    enabled: false,
    enableVertical: false,
    verticalConfig: {
        enabled: false,
        rotation: 0,
        align: 'center',
        offset: 0,
    },
}

/**
 * 连接线运动路径管理器
 * 处理连接线的路径动画和垂直对齐
 */
export class ConnectorMotionPathManager {
    private config: IConnectorMotionPathConfig
    private motionElements: Map<IUI, IConnectorMotionPathConfig> = new Map()

    constructor(config: IConnectorMotionPathConfig = DEFAULT_CONNECTOR_MOTION_CONFIG) {
        this.config = config
    }

    /**
     * 设置连接线运动路径
     * @param connector 连接线元素
     * @param pathData 路径数据
     * @param verticalConfig 垂直对齐配置（可选）
     */
    setConnectorMotionPath(
        connector: IUI,
        pathData: string | any[],
        verticalConfig?: Partial<IMotionVerticalConfig>
    ): void {
        if (!this.config.enabled) {
            console.warn('[LeafJS v2.2] Motion path is not enabled')
            return
        }

        const finalVerticalConfig: IMotionVerticalConfig = {
            ...this.config.verticalConfig,
            ...verticalConfig,
        }

        const config: IConnectorMotionPathConfig = {
            enabled: true,
            pathData,
            enableVertical: finalVerticalConfig.enabled,
            verticalConfig: finalVerticalConfig,
        }

        // 应用运动路径
        connector.motionPath = pathData

        // 应用垂直对齐（如果启用）
        if (finalVerticalConfig.enabled) {
            applyMotionVertical(connector, finalVerticalConfig)
        }

        this.motionElements.set(connector, config)
    }

    /**
     * 设置运动路径垂直对齐（单独配置）
     * @param connector 连接线元素
     * @param verticalConfig 垂直对齐配置
     */
    setMotionVertical(connector: IUI, verticalConfig: Partial<IMotionVerticalConfig>): void {
        if (!connector.motionPath) {
            console.warn('[LeafJS v2.2] Connector has no motion path')
            return
        }

        const finalVerticalConfig: IMotionVerticalConfig = {
            ...this.config.verticalConfig,
            ...verticalConfig,
            enabled: true,
        }

        applyMotionVertical(connector, finalVerticalConfig)

        // 更新记录
        const existingConfig = this.motionElements.get(connector)
        if (existingConfig) {
            existingConfig.verticalConfig = finalVerticalConfig
            existingConfig.enableVertical = true
        }
    }

    /**
     * 垂直对齐预设配置
     */
    static readonly VERTICAL_PRESETS = {
        /** 顶部对齐 */
        topAlign: (): IMotionVerticalConfig => ({
            enabled: true,
            rotation: 0,
            align: 'top',
            offset: 0,
        }),

        /** 中心对齐 */
        centerAlign: (): IMotionVerticalConfig => ({
            enabled: true,
            rotation: 0,
            align: 'center',
            offset: 0,
        }),

        /** 底部对齐 */
        bottomAlign: (): IMotionVerticalConfig => ({
            enabled: true,
            rotation: 0,
            align: 'bottom',
            offset: 0,
        }),

        /** 垂直90度旋转 */
        verticalRotate: (): IMotionVerticalConfig => ({
            enabled: true,
            rotation: 90,
            align: 'center',
            offset: 0,
        }),

        /** 垂直180度旋转 */
        verticalRotate180: (): IMotionVerticalConfig => ({
            enabled: true,
            rotation: 180,
            align: 'center',
            offset: 0,
        }),
    }

    /**
     * 应用预设垂直对齐
     * @param connector 连接线元素
     * @param presetName 预设名称
     */
    applyVerticalPreset(
        connector: IUI,
        presetName: keyof typeof ConnectorMotionPathManager.VERTICAL_PRESETS
    ): void {
        const preset = ConnectorMotionPathManager.VERTICAL_PRESETS[presetName]()
        this.setMotionVertical(connector, preset)
    }

    /**
     * 获取连接线的运动路径配置
     */
    getMotionConfig(connector: IUI): IConnectorMotionPathConfig | undefined {
        return this.motionElements.get(connector)
    }

    /**
     * 移除连接线的运动路径
     */
    removeMotionPath(connector: IUI): void {
        connector.motionPath = undefined
        // @ts-ignore
        connector.motionVertical = undefined
        this.motionElements.delete(connector)
    }

    /**
     * 批量设置运动路径
     */
    setMotionPathBatch(
        connectors: IUI[],
        pathData: string | any[],
        verticalConfig?: Partial<IMotionVerticalConfig>
    ): void {
        connectors.forEach((connector) => {
            this.setConnectorMotionPath(connector, pathData, verticalConfig)
        })
    }

    /**
     * 获取所有启用运动路径的连接线
     */
    getMotionPathConnectors(): IUI[] {
        return Array.from(this.motionElements.keys())
    }

    /**
     * 清除所有运动路径配置
     */
    clearAllMotionPaths(): void {
        this.motionElements.forEach((_, connector) => {
            this.removeMotionPath(connector)
        })
        this.motionElements.clear()
    }

    /**
     * 更新全局配置
     */
    updateConfig(config: Partial<IConnectorMotionPathConfig>): void {
        this.config = { ...this.config, ...config }
    }

    /**
     * 获取全局配置
     */
    getConfig(): IConnectorMotionPathConfig {
        return this.config
    }
}

/**
 * 创建默认连接线运动路径管理器
 */
export function createDefaultConnectorMotionManager(): ConnectorMotionPathManager {
    return new ConnectorMotionPathManager({
        ...DEFAULT_CONNECTOR_MOTION_CONFIG,
        enableVertical: true, // 默认启用垂直对齐功能
    })
}
