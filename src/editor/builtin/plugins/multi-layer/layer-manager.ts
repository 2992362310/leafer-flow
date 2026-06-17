import { ref, computed } from "vue";
import type { App } from "leafer";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

const STORAGE_KEY = "leafer-flow.layers";

export function useLayerManager(app: App) {
  const layers = ref<Layer[]>([]);
  const activeLayerId = ref<string>("default");

  // 初始化
  function init() {
    loadLayers();
    if (layers.value.length === 0) {
      layers.value = [
        {
          id: "default",
          name: "默认图层",
          visible: true,
          locked: false,
          opacity: 1,
        },
      ];
    }
    activeLayerId.value = layers.value[0].id;
  }

  // 加载图层配置
  function loadLayers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        layers.value = JSON.parse(raw);
      }
    } catch {
      // 忽略解析错误
    }
  }

  // 保存图层配置
  function saveLayers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layers.value));
    } catch (error) {
      console.warn("保存图层配置失败", error);
    }
  }

  // 添加图层
  function addLayer(name?: string): Layer {
    const id = `layer-${Date.now()}`;
    const layer: Layer = {
      id,
      name: name || `图层 ${layers.value.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
    };
    layers.value.push(layer);
    activeLayerId.value = id;
    saveLayers();
    return layer;
  }

  // 删除图层
  function removeLayer(id: string): boolean {
    if (layers.value.length <= 1) {
      return false; // 至少保留一个图层
    }

    const index = layers.value.findIndex((l) => l.id === id);
    if (index === -1) return false;

    layers.value.splice(index, 1);

    // 如果删除的是活动图层，切换到第一个图层
    if (activeLayerId.value === id) {
      activeLayerId.value = layers.value[0].id;
    }

    saveLayers();
    return true;
  }

  // 重命名图层
  function renameLayer(id: string, name: string): boolean {
    const layer = layers.value.find((l) => l.id === id);
    if (!layer) return false;

    layer.name = name;
    saveLayers();
    return true;
  }

  // 切换图层可见性
  function toggleVisibility(id: string): boolean {
    const layer = layers.value.find((l) => l.id === id);
    if (!layer) return false;

    layer.visible = !layer.visible;
    saveLayers();
    return true;
  }

  // 切换图层锁定
  function toggleLock(id: string): boolean {
    const layer = layers.value.find((l) => l.id === id);
    if (!layer) return false;

    layer.locked = !layer.locked;
    saveLayers();
    return true;
  }

  // 设置图层透明度
  function setOpacity(id: string, opacity: number): boolean {
    const layer = layers.value.find((l) => l.id === id);
    if (!layer) return false;

    layer.opacity = Math.max(0, Math.min(1, opacity));
    saveLayers();
    return true;
  }

  // 切换活动图层
  function setActiveLayer(id: string): boolean {
    const layer = layers.value.find((l) => l.id === id);
    if (!layer) return false;

    activeLayerId.value = id;
    return true;
  }

  // 获取活动图层
  const activeLayer = computed(() => {
    return layers.value.find((l) => l.id === activeLayerId.value);
  });

  // 移动图层
  function moveLayer(id: string, direction: "up" | "down"): boolean {
    const index = layers.value.findIndex((l) => l.id === id);
    if (index === -1) return false;

    if (direction === "up" && index < layers.value.length - 1) {
      const temp = layers.value[index];
      layers.value[index] = layers.value[index + 1];
      layers.value[index + 1] = temp;
    } else if (direction === "down" && index > 0) {
      const temp = layers.value[index];
      layers.value[index] = layers.value[index - 1];
      layers.value[index - 1] = temp;
    } else {
      return false;
    }

    saveLayers();
    return true;
  }

  init();

  return {
    layers,
    activeLayerId,
    activeLayer,
    addLayer,
    removeLayer,
    renameLayer,
    toggleVisibility,
    toggleLock,
    setOpacity,
    setActiveLayer,
    moveLayer,
  };
}
