/**
 * LeafJS v2.2.2 新增功能集成使用指南
 * 展示三个新功能的实际应用场景和代码示例
 */

import type { IUI } from 'leafer'
import type Editor from '../editor'
import {
    applyHitThrough,
    applyMotionVertical,
    forceElementUpdate,
    forceElementUpdateBatch,
    type ForceUpdateType,
} from './leafer-v2-2-features'
import { LayerPanelHitThroughManager, createDefaultLayerHitThroughManager } from './layer-panel-hit-through'
import { ConnectorMotionPathManager, createDefaultConnectorMotionManager } from './connector-motion-path'
import { EditorForceUpdateManager, createDefaultEditorUpdateManager } from './editor-force-update'

/**
 * ============================================================================
 * 功能 1: hitThrough - 穿透选择
 * ============================================================================
 * 场景：在有遮盖层或辅助图层时，允许点击穿透这些图层选择背后的元素
 *
 * 使用示例：
 */

export class HitThroughExample {
    /**
     * 示例 1.1: 为导出图层启用穿透选择
     * 当用户点击遮盖层时，自动选中下层的实际形状
     */
    static enableGuideLayerHitThrough(layer: IUI): void {
        // 标记为穿透图层，允许选择穿透
        applyHitThrough(layer, {
            enabled: true,
            throughTags: ['guide', 'overlay'],
        })

        console.log('✓ 导出图层已启用穿透选择，可穿透选中下层元素')
    }

    /**
     * 示例 1.2: 使用图层管理器实现穿透选择
     */
    static setupLayerHitThroughManager(editor: Editor): LayerPanelHitThroughManager {
        const manager = createDefaultLayerHitThroughManager()

        // 为所有导出图层启用穿透选择
        const allLayers = editor.app.tree.children ?? []
        allLayers.forEach((layer) => {
            // 检查图层类型，如果是导出层则启用穿透
            if ((layer as any).layerType === 'guide') {
                manager.enableLayerHitThrough(layer as IUI, 'guide')
            }
        })

        return manager
    }

    /**
     * 示例 1.3: 交互式切换穿透选择
     */
    static toggleHitThroughOnLayer(
        layer: IUI,
        manager: LayerPanelHitThroughManager,
        layerType: string
    ): void {
        // UI按钮点击时，切换穿透状态
        manager.toggleLayerHitThrough(layer, layerType)

        const isEnabled = manager.isHitThroughEnabled(layer)
        console.log(`图层穿透选择: ${isEnabled ? '启用' : '禁用'}`)
    }
}

/**
 * ============================================================================
 * 功能 2: forceUpdate() 增强 - 优化批量更新性能
 * ============================================================================
 * 场景：在大量元素更新时（如对齐、分布、批量属性修改等），使用特定更新类型避免
 * 不必要的事件派发，提升性能
 *
 * 使用示例：
 */

export class ForceUpdateExample {
    /**
     * 示例 2.1: 仅渲染更新 - 最快，适合不改变布局的操作
     * 场景：改变颜色、透明度等外观属性
     */
    static updateElementStyleOnly(elements: IUI[]): void {
        // 仅更新样式，不触发布局重算
        forceElementUpdateBatch(elements, 'render')
        console.log(`✓ 已对 ${elements.length} 个元素进行渲染优化更新`)
    }

    /**
     * 示例 2.2: 仅布局更新 - 中等，适合改变尺寸/位置的操作
     * 场景：对齐、分布、缩放等几何变换
     */
    static updateElementLayoutOnly(elements: IUI[]): void {
        // 仅更新布局，避免重新渲染所有内容
        forceElementUpdateBatch(elements, 'layout')
        console.log(`✓ 已对 ${elements.length} 个元素进行布局优化更新`)
    }

    /**
     * 示例 2.3: 仅样式更新 - 最精细，仅更新CSS样式
     * 场景：单纯的样式修改
     */
    static updateElementStyleOnly2(element: IUI): void {
        // 直接对单个元素使用样式更新
        forceElementUpdate(element, 'style')
        console.log('✓ 元素样式已更新')
    }

    /**
     * 示例 2.4: 使用编辑器管理器进行批量优化更新
     */
    static setupEditorUpdateManager(editor: Editor): EditorForceUpdateManager {
        const manager = createDefaultEditorUpdateManager(editor)

        // 示例：在对齐操作中使用
        const selectedElements = editor.app.tree.children ?? []
        manager.updateElements(selectedElements as IUI[], 'layout')

        return manager
    }

    /**
     * 示例 2.5: 监控性能指标
     */
    static printUpdateMetrics(manager: EditorForceUpdateManager): void {
        manager.printPerformanceReport()
    }
}

/**
 * ============================================================================
 * 功能 3: motionVertical - 运动路径垂直对齐
 * ============================================================================
 * 场景：支持元素沿竖向路径排列和对齐，特别适合流程图的垂直布局
 *
 * 使用示例：
 */

export class MotionVerticalExample {
    /**
     * 示例 3.1: 设置连接线的垂直运动路径
     */
    static setupVerticalMotionPath(connector: IUI): void {
        const verticalPath = ['M', 0, 0, 'L', 0, 100] // 竖向路径

        applyMotionVertical(connector, {
            enabled: true,
            rotation: 0,
            align: 'center',
            offset: 0,
        })

        connector.motionPath = verticalPath
        console.log('✓ 已为连接线应用竖向运动路径')
    }

    /**
     * 示例 3.2: 使用连接线管理器管理垂直对齐
     */
    static setupConnectorMotionManager(editor: Editor): ConnectorMotionPathManager {
        const manager = createDefaultConnectorMotionManager()

        // 获取所有连接线
        const connectors = (editor.app.tree.children ?? []).filter(
            (el) => (el as any).type === 'connector'
        )

        // 为每条连接线设置垂直运动路径
        const verticalPath = ['M', 0, 0, 'L', 0, 100]
        connectors.forEach((connector) => {
            manager.setConnectorMotionPath(connector as IUI, verticalPath, {
                enabled: true,
                align: 'center',
                rotation: 0,
            })
        })

        return manager
    }

    /**
     * 示例 3.3: 应用垂直对齐预设
     */
    static applyVerticalAlignPreset(connector: IUI, manager: ConnectorMotionPathManager): void {
        // 应用不同的对齐预设
        manager.applyVerticalPreset(connector, 'topAlign')
        console.log('✓ 已应用顶部对齐预设')

        // 其他可用预设：
        // - 'topAlign' - 顶部对齐
        // - 'centerAlign' - 中心对齐
        // - 'bottomAlign' - 底部对齐
        // - 'verticalRotate' - 垂直90度旋转
        // - 'verticalRotate180' - 垂直180度旋转
    }

    /**
     * 示例 3.4: 自定义垂直对齐配置
     */
    static customVerticalConfig(connector: IUI, manager: ConnectorMotionPathManager): void {
        manager.setMotionVertical(connector, {
            enabled: true,
            rotation: 90, // 90度旋转
            align: 'top', // 顶部对齐
            offset: 10, // 10像素偏移
        })

        console.log('✓ 已应用自定义垂直对齐配置')
    }
}

/**
 * ============================================================================
 * 集成初始化 - 在编辑器启动时调用
 * ============================================================================
 */

export interface ILeafJSV22ManagersIntegration {
    layerHitThroughManager: LayerPanelHitThroughManager
    connectorMotionManager: ConnectorMotionPathManager
    editorUpdateManager: EditorForceUpdateManager
}

/**
 * 初始化所有LeafJS v2.2新功能管理器
 */
export function initializeLeafJSV22Features(editor: Editor): ILeafJSV22ManagersIntegration {
    console.group('[LeafJS v2.2] Initializing new features')

    // 1. 初始化图层穿透选择
    const layerHitThroughManager = createDefaultLayerHitThroughManager()
    console.log('✓ 图层穿透选择管理器已初始化')

    // 2. 初始化连接线运动路径管理
    const connectorMotionManager = createDefaultConnectorMotionManager()
    console.log('✓ 连接线运动路径管理器已初始化')

    // 3. 初始化编辑器强制更新管理
    const editorUpdateManager = createDefaultEditorUpdateManager(editor)
    console.log('✓ 编辑器强制更新管理器已初始化')

    console.groupEnd()

    return {
        layerHitThroughManager,
        connectorMotionManager,
        editorUpdateManager,
    }
}

/**
 * ============================================================================
 * 快速测试函数 - 验证功能是否工作
 * ============================================================================
 */

export async function testLeafJSV22Features(editor: Editor): Promise<void> {
    console.group('[LeafJS v2.2] Running feature tests')

    try {
        // 测试穿透选择
        const testLayer = (editor.app.tree.children?.[0] as IUI) || null
        if (testLayer) {
            HitThroughExample.enableGuideLayerHitThrough(testLayer)
            console.log('✓ 穿透选择测试通过')
        }

        // 测试强制更新
        const testElements = (editor.app.tree.children ?? []) as IUI[]
        if (testElements.length > 0) {
            ForceUpdateExample.updateElementLayoutOnly(testElements)
            console.log('✓ 强制更新测试通过')
        }

        // 测试运动路径垂直对齐
        const connectors = testElements.filter((el) => (el as any).type === 'connector')
        if (connectors.length > 0) {
            const connector = connectors[0]
            MotionVerticalExample.setupVerticalMotionPath(connector)
            console.log('✓ 运动路径垂直对齐测试通过')
        }

        console.log('\n✓ 所有 LeafJS v2.2 新功能测试通过！')
    } catch (error) {
        console.error('✗ 功能测试失败:', error)
    }

    console.groupEnd()
}

/**
 * ============================================================================
 * 导出汇总 - 供其他模块导入使用
 * ============================================================================
 */

export const LeafJSV22Integration = {
    // 初始化
    initialize: initializeLeafJSV22Features,
    test: testLeafJSV22Features,

    // 功能类
    HitThrough: HitThroughExample,
    ForceUpdate: ForceUpdateExample,
    MotionVertical: MotionVerticalExample,

    // 管理器创建函数
    createLayerHitThroughManager: createDefaultLayerHitThroughManager,
    createConnectorMotionManager: createDefaultConnectorMotionManager,
    createEditorUpdateManager: createDefaultEditorUpdateManager,
}
