/**
 * LeafJS v2.2.2 新增功能导出模块
 * 汇总所有新功能的导出，方便在项目各处使用
 */

// 核心功能导出
export {
    applyHitThrough,
    disableHitThrough,
    forceElementUpdate,
    forceElementUpdateBatch,
    applyMotionVertical,
    createHitThroughLayer,
    createOptimizedUpdateStrategy,
} from './leafer-v2-2-features'

export type { IHitThroughConfig, IMotionVerticalConfig } from './leafer-v2-2-features'
export type { ForceUpdateType } from './leafer-v2-2-features'

// 图层面板穿透选择导出
export {
    LayerPanelHitThroughManager,
    createDefaultLayerHitThroughManager,
    DEFAULT_LAYER_PANEL_CONFIG,
} from './layer-panel-hit-through'

export type { ILayerPanelConfig } from './layer-panel-hit-through'

// 连接线运动路径导出
export {
    ConnectorMotionPathManager,
    createDefaultConnectorMotionManager,
    DEFAULT_CONNECTOR_MOTION_CONFIG,
} from './connector-motion-path'

export type { IConnectorMotionPathConfig } from './connector-motion-path'

// 编辑器强制更新导出
export {
    EditorForceUpdateManager,
    createDefaultEditorUpdateManager,
    optimizeSelectionUpdate,
    optimizeTransformUpdate,
    optimizeStyleUpdate,
    DEFAULT_EDITOR_UPDATE_STRATEGY,
} from './editor-force-update'

export type { IEditorUpdateStrategy } from './editor-force-update'

// 集成和示例导出
export {
    HitThroughExample,
    ForceUpdateExample,
    MotionVerticalExample,
    initializeLeafJSV22Features,
    testLeafJSV22Features,
    LeafJSV22Integration,
} from './leafer-v2-2-integration'

export type { ILeafJSV22ManagersIntegration } from './leafer-v2-2-integration'
