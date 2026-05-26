<script setup lang="ts">
import {
  getConnectorRouteType,
  getFreehandSmoothness,
  getSnapEnabled,
  setConnectorRouteType,
  setFreehandSmoothness,
  setSnapEnabled,
} from "../editor";
import { ACTION_NAME } from "../editor/constants";
import Icon from "./Icon.vue";

const emits = defineEmits(["action"]);

const alignActions = [
  { action: ACTION_NAME.ALIGN_LEFT, icon: "align_left", label: "左对齐" },
  { action: ACTION_NAME.ALIGN_CENTER, icon: "align_center", label: "水平居中" },
  { action: ACTION_NAME.ALIGN_RIGHT, icon: "align_right", label: "右对齐" },
  { action: ACTION_NAME.ALIGN_TOP, icon: "align_top", label: "顶部对齐" },
  { action: ACTION_NAME.ALIGN_MIDDLE, icon: "align_middle", label: "垂直居中" },
  { action: ACTION_NAME.ALIGN_BOTTOM, icon: "align_bottom", label: "底部对齐" },
  { action: ACTION_NAME.DISTRIBUTE_HORIZONTAL, icon: "distribute_horizontal", label: "水平分布" },
  { action: ACTION_NAME.DISTRIBUTE_VERTICAL, icon: "distribute_vertical", label: "垂直分布" },
];

const layerActions = [
  { action: ACTION_NAME.BRING_FORWARD, icon: "arrow-up", label: "上移一层" },
  { action: ACTION_NAME.SEND_BACKWARD, icon: "arrow-down", label: "下移一层" },
  { action: ACTION_NAME.BRING_TO_FRONT, icon: "arrow-up", label: "置于顶层" },
  { action: ACTION_NAME.SEND_TO_BACK, icon: "arrow-down", label: "置于底层" },
  { action: ACTION_NAME.CONNECTORS_TO_FRONT, icon: "draw_arrow", label: "连接线置顶" },
  { action: ACTION_NAME.LOCK_SELECTED, icon: "lock", label: "锁定选中" },
  { action: ACTION_NAME.UNLOCK_SELECTED, icon: "unlock", label: "解锁选中" },
  { action: ACTION_NAME.TOGGLE_VISIBLE, icon: "visible", label: "切换显示" },
] as const;

const templateGroups = [
  {
    title: "业务流程",
    items: [
      { action: ACTION_NAME.TEMPLATE_APPROVAL, icon: "template", label: "审批流程" },
      { action: ACTION_NAME.TEMPLATE_DECISION, icon: "flow_decision", label: "判断分支" },
      { action: ACTION_NAME.TEMPLATE_WORK_ORDER, icon: "flow_process", label: "工单流转" },
      { action: ACTION_NAME.TEMPLATE_CRM, icon: "template", label: "CRM 跟进" },
      { action: ACTION_NAME.TEMPLATE_LOGIN, icon: "flow_start_end", label: "登录注册" },
      { action: ACTION_NAME.TEMPLATE_PAYMENT, icon: "flow_database", label: "支付流程" },
    ],
  },
  {
    title: "专业图",
    items: [
      { action: ACTION_NAME.TEMPLATE_BPMN_ORDER, icon: "bpmn_start_event", label: "BPMN 订单" },
      {
        action: ACTION_NAME.TEMPLATE_SYSTEM_ARCHITECTURE,
        icon: "arch_component",
        label: "系统架构",
      },
      {
        action: ACTION_NAME.TEMPLATE_SWIMLANE_COLLABORATION,
        icon: "flow_swimlane",
        label: "泳道协作",
      },
    ],
  },
] as const;

const exportActions = [
  { action: ACTION_NAME.EXPORT_PNG, icon: "export", label: "导出 PNG" },
  { action: ACTION_NAME.EXPORT_SVG, icon: "export", label: "导出 SVG" },
];

const connectorRouteOptions = [
  { value: "orthogonal", label: "直角线" },
  { value: "bezier", label: "曲线" },
  { value: "straight", label: "直线" },
] as const;

const snapOptions = [
  { value: true, label: "开启吸附" },
  { value: false, label: "关闭吸附" },
] as const;

function handleRouteChange(value: string) {
  setConnectorRouteType(value as "orthogonal" | "bezier" | "straight");
}

function handleSmoothnessChange(value: number) {
  setFreehandSmoothness(value);
}

function handleSnapChange(value: boolean) {
  setSnapEnabled(value);
}

function handleClick(action: string) {
  emits("action", action);
}
</script>

<template>
  <div class="join">
    <div class="tooltip tooltip-bottom" data-tip="撤销 (Ctrl+Z)">
      <button @click="handleClick(ACTION_NAME.UNDO)" class="btn btn-sm join-item h-9 w-9 px-0">
        <Icon name="undo" class="h-5 w-5" />
      </button>
    </div>

    <div class="tooltip tooltip-bottom" data-tip="重做 (Ctrl+Shift+Z)">
      <button @click="handleClick(ACTION_NAME.REDO)" class="btn btn-sm join-item h-9 w-9 px-0">
        <Icon name="redo" class="h-5 w-5" />
      </button>
    </div>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="对齐与分布">
        <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
          <Icon name="align_center" class="h-5 w-5" />
        </button>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-20 w-40 p-2 shadow border border-base-200"
      >
        <li v-for="item in alignActions" :key="item.action">
          <button @click="handleClick(item.action)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="图层与状态">
        <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
          <Icon name="layer" class="h-5 w-5" />
        </button>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-20 w-40 p-2 shadow border border-base-200"
      >
        <li v-for="item in layerActions" :key="item.action">
          <button @click="handleClick(item.action)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>

    <div class="dropdown dropdown-bottom dropdown-end">
      <div class="tooltip tooltip-bottom" data-tip="绘制设置">
        <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
          <Icon name="template" class="h-5 w-5" />
        </button>
      </div>
      <div
        tabindex="0"
        class="dropdown-content bg-base-100 rounded-box z-20 w-56 p-3 shadow border border-base-200"
      >
        <div class="mb-3">
          <div class="text-xs font-medium mb-2">连线样式</div>
          <div class="join w-full">
            <button
              v-for="item in connectorRouteOptions"
              :key="item.value"
              class="btn btn-xs join-item flex-1"
              :class="{ 'btn-primary': getConnectorRouteType() === item.value }"
              @click="handleRouteChange(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="mb-3">
          <div class="flex items-center justify-between text-xs font-medium mb-2">
            <span>自由绘制平滑度</span>
            <span class="tabular-nums">{{ getFreehandSmoothness().toFixed(1) }}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            :value="getFreehandSmoothness()"
            @input="(e) => handleSmoothnessChange(Number((e.target as HTMLInputElement).value))"
            class="range range-xs"
          />
        </div>
        <div>
          <div class="text-xs font-medium mb-2">吸附</div>
          <div class="join w-full">
            <button
              v-for="item in snapOptions"
              :key="String(item.value)"
              class="btn btn-xs join-item flex-1"
              :class="{ 'btn-primary': getSnapEnabled() === item.value }"
              @click="handleSnapChange(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="tooltip tooltip-bottom" data-tip="添加连线标签">
      <button
        @click="handleClick(ACTION_NAME.ADD_CONNECTOR_LABEL)"
        class="btn btn-sm join-item h-9 w-9 px-0"
      >
        <Icon name="connector_label" class="h-5 w-5" />
      </button>
    </div>

    <div class="dropdown dropdown-bottom">
      <div class="tooltip tooltip-bottom" data-tip="模板库">
        <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
          <Icon name="template" class="h-5 w-5" />
        </button>
      </div>
      <div
        tabindex="0"
        class="dropdown-content bg-base-100 rounded-box z-20 w-52 p-2 shadow border border-base-200"
      >
        <div v-for="group in templateGroups" :key="group.title" class="mb-2 last:mb-0">
          <div class="px-2 py-1 text-[11px] font-semibold text-base-content/60">
            {{ group.title }}
          </div>
          <ul class="menu p-0">
            <li v-for="item in group.items" :key="item.action">
              <button @click="handleClick(item.action)" class="text-xs">
                <Icon :name="item.icon" class="h-4 w-4" />
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div class="tooltip tooltip-bottom" data-tip="保存 (Ctrl+S)">
      <button @click="handleClick(ACTION_NAME.SAVE)" class="btn btn-sm join-item h-9 w-9 px-0">
        <Icon name="save" class="h-5 w-5" />
      </button>
    </div>

    <div class="tooltip tooltip-bottom" data-tip="打开文件">
      <button @click="handleClick(ACTION_NAME.LOAD)" class="btn btn-sm join-item h-9 w-9 px-0">
        <Icon name="load" class="h-5 w-5" />
      </button>
    </div>

    <div class="dropdown dropdown-bottom dropdown-end">
      <div class="tooltip tooltip-bottom" data-tip="导出">
        <button tabindex="0" role="button" class="btn btn-sm join-item h-9 w-9 px-0">
          <Icon name="export" class="h-5 w-5" />
        </button>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-20 w-36 p-2 shadow border border-base-200"
      >
        <li v-for="item in exportActions" :key="item.action">
          <button @click="handleClick(item.action)" class="text-xs">
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>

    <span class="divider divider-horizontal mx-0 my-1"></span>

    <div class="tooltip tooltip-bottom" data-tip="清空画布">
      <button
        @click="handleClick(ACTION_NAME.CLEAR_CANVAS)"
        class="btn btn-sm btn-error join-item h-9 w-9 px-0 bg-red-50 hover:bg-red-100 border-none text-red-500"
      >
        <Icon name="clear" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>
