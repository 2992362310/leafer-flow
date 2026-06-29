<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { DiagramLintUpdatedEventDetail, LintFixSummary, LintIssue } from "./types";

const props = defineProps<{
  open: boolean;
  issues?: LintIssue[];
  generatedAt?: number;
  fixSummary?: LintFixSummary | null;
}>();

const emits = defineEmits<{
  close: [];
  focusIssue: [issueId: string];
  fixIssue: [issueId: string];
  fixNext: [issueId: string];
  fixPipeline: [];
  fixAll: [];
  fixRule: [ruleId: string];
  focusPathNode: [payload: { issueId: string; nodeId: string }];
}>();

const EVENT_NAME = "leafer-flow:diagram-lint-updated";
const issues = ref<LintIssue[]>([]);
const generatedAt = ref<number | null>(null);
const severityFilter = ref<"all" | "error" | "warning">("all");
const onlyFixable = ref(false);
const ruleFilter = ref<string>("all");
const activeIssueId = ref<string | null>(null);
const resolvedIssues = computed(() => props.issues ?? issues.value);
const resolvedGeneratedAt = computed(() => props.generatedAt ?? generatedAt.value);

const summary = computed(() => {
  const all = resolvedIssues.value;
  return {
    total: all.length,
    error: all.filter((item) => item.severity === "error").length,
    warning: all.filter((item) => item.severity === "warning").length,
    fixable: all.filter((item) => item.fixable).length,
  };
});

const remainingCount = computed(() => props.fixSummary?.remainingCount ?? summary.value.total);

const groupedByRule = computed(() => {
  const map = new Map<string, { total: number; fixable: number }>();
  for (const issue of resolvedIssues.value) {
    const current = map.get(issue.ruleId) ?? { total: 0, fixable: 0 };
    current.total += 1;
    if (issue.fixable) current.fixable += 1;
    map.set(issue.ruleId, current);
  }
  return Array.from(map.entries())
    .map(([ruleId, stats]) => ({ ruleId, ...stats }))
    .sort((a, b) => b.total - a.total || a.ruleId.localeCompare(b.ruleId));
});

const ruleOptions = computed(() => {
  const set = new Set(resolvedIssues.value.map((issue) => issue.ruleId));
  return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
});

const filteredIssues = computed(() => {
  return resolvedIssues.value.filter((issue) => {
    if (severityFilter.value !== "all" && issue.severity !== severityFilter.value) return false;
    if (onlyFixable.value && !issue.fixable) return false;
    if (ruleFilter.value !== "all" && issue.ruleId !== ruleFilter.value) return false;
    return true;
  });
});

const hasIssues = computed(() => filteredIssues.value.length > 0);
const activeIndex = computed(() => {
  if (!activeIssueId.value) return -1;
  return filteredIssues.value.findIndex((issue) => issue.id === activeIssueId.value);
});

function ensureActiveIssue() {
  if (filteredIssues.value.length === 0) {
    activeIssueId.value = null;
    return;
  }

  const exists = filteredIssues.value.some((issue) => issue.id === activeIssueId.value);
  if (!exists) {
    activeIssueId.value = filteredIssues.value[0].id;
  }
}

function selectIssue(issueId: string, focus = false) {
  activeIssueId.value = issueId;
  if (focus) emits("focusIssue", issueId);
}

function navigateIssue(offset: 1 | -1) {
  if (filteredIssues.value.length === 0) return;
  ensureActiveIssue();
  const current = activeIndex.value >= 0 ? activeIndex.value : 0;
  const next = (current + offset + filteredIssues.value.length) % filteredIssues.value.length;
  const issue = filteredIssues.value[next];
  activeIssueId.value = issue.id;
  emits("focusIssue", issue.id);
}

function onUpdated(event: Event) {
  const customEvent = event as CustomEvent<DiagramLintUpdatedEventDetail>;
  issues.value = customEvent.detail?.issues ?? [];
  generatedAt.value = customEvent.detail?.generatedAt ?? Date.now();
  ensureActiveIssue();
}

function onPanelKeydown(event: KeyboardEvent) {
  if (!props.open) return;
  const target = event.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    navigateIssue(1);
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    navigateIssue(-1);
  } else if (event.key === "Enter" && activeIssueId.value) {
    event.preventDefault();
    emits("focusIssue", activeIssueId.value);
  } else if (event.key.toLowerCase() === "f" && activeIssueId.value) {
    event.preventDefault();
    emits("fixNext", activeIssueId.value);
  }
}

function levelClass(severity: LintIssue["severity"]) {
  return severity === "error"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function levelLabel(severity: LintIssue["severity"]) {
  return severity === "error" ? "严重" : "提示";
}

function formatTime(timestamp: number | null) {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleTimeString();
}

onMounted(() => {
  window.addEventListener(EVENT_NAME, onUpdated as EventListener);
  window.addEventListener("keydown", onPanelKeydown);
  ensureActiveIssue();
});

onUnmounted(() => {
  window.removeEventListener(EVENT_NAME, onUpdated as EventListener);
  window.removeEventListener("keydown", onPanelKeydown);
});

watch(filteredIssues, () => {
  ensureActiveIssue();
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-30 flex items-center justify-end bg-black/20" @click.self="emits('close')">
    <div class="h-full w-[380px] bg-base-100 shadow-2xl border-l border-base-200 flex flex-col">
      <div class="px-4 py-3 border-b border-base-200 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold">规范检查结果</h3>
          <p class="text-xs text-base-content/60">最近更新：{{ formatTime(resolvedGeneratedAt) }}</p>
        </div>
        <div class="flex items-center gap-1">
          <button class="btn btn-xs" :disabled="!hasIssues" @click="navigateIssue(-1)">上一条</button>
          <button class="btn btn-xs" :disabled="!hasIssues" @click="navigateIssue(1)">下一条</button>
          <button class="btn btn-xs" @click="emits('close')">关闭</button>
        </div>
      </div>

      <div class="px-4 py-2 border-b border-base-200 flex items-center gap-2">
        <select v-model="severityFilter" class="select select-xs w-28">
          <option value="all">全部级别</option>
          <option value="error">仅严重</option>
          <option value="warning">仅提示</option>
        </select>
        <label class="label cursor-pointer gap-1 py-0">
          <input v-model="onlyFixable" type="checkbox" class="checkbox checkbox-xs" />
          <span class="label-text text-xs">仅可修复</span>
        </label>
        <select v-model="ruleFilter" class="select select-xs flex-1 min-w-0">
          <option v-for="rule in ruleOptions" :key="rule" :value="rule">
            {{ rule === 'all' ? '全部规则' : rule }}
          </option>
        </select>
      </div>

      <div class="px-4 py-2 border-b border-base-200 grid grid-cols-4 gap-2 text-[11px]">
        <div
          class="rounded border px-2 py-1"
          :class="props.fixSummary ? 'border-success/30 bg-success/10 text-success' : 'border-base-300'"
        >
          剩余 {{ remainingCount }}
        </div>
        <div class="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">严重 {{ summary.error }}</div>
        <div class="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">提示 {{ summary.warning }}</div>
        <button
          class="rounded border px-2 py-1 text-left transition hover:bg-base-200 disabled:opacity-50"
          :disabled="summary.fixable === 0"
          @click="emits('fixAll')"
        >
          一键修复 {{ summary.fixable }}
        </button>
      </div>

      <div class="px-4 py-2 border-b border-base-200 flex items-center gap-2">
        <button class="btn btn-xs" :disabled="!activeIssueId" @click="activeIssueId && emits('fixNext', activeIssueId)">
          修复并下一条 (F)
        </button>
        <button class="btn btn-xs" :disabled="summary.fixable === 0" @click="emits('fixPipeline')">
          自动连续修复
        </button>
      </div>

      <div v-if="props.fixSummary" class="px-4 py-2 border-b border-base-200 text-[11px] text-base-content/75">
        <div>
          最近修复：模式 {{ props.fixSummary.mode }}，已修复 {{ props.fixSummary.fixedCount }}，跳过 {{ props.fixSummary.skippedCount }}，剩余 {{ props.fixSummary.remainingCount }}
        </div>
        <div v-if="props.fixSummary.touchedRules.length > 0" class="mt-1">
          规则：{{ props.fixSummary.touchedRules.join('，') }}
        </div>
        <div v-if="props.fixSummary.note" class="mt-1 text-warning">
          {{ props.fixSummary.note }}
        </div>
      </div>

      <div class="p-3 overflow-y-auto flex-1">
        <div class="mb-3" v-if="groupedByRule.length > 0">
          <div class="text-[11px] text-base-content/60 mb-2">规则分布</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in groupedByRule"
              :key="item.ruleId"
              class="badge badge-outline h-auto py-1 px-2 gap-1"
              @click="ruleFilter = item.ruleId"
            >
              <span>{{ item.ruleId }}</span>
              <span>({{ item.total }})</span>
            </button>
            <button class="badge badge-outline h-auto py-1 px-2" @click="ruleFilter = 'all'">清空筛选</button>
          </div>
        </div>

        <div v-if="!hasIssues" class="text-xs text-base-content/60 p-3 border border-dashed rounded-lg">
          暂无检查结果。先执行“规范检查 Pro -> 执行规范检查”。
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="issue in filteredIssues"
            :key="issue.id"
            class="w-full text-left rounded-lg border px-3 py-2 transition hover:shadow-sm"
            :class="[
              levelClass(issue.severity),
              activeIssueId === issue.id ? 'ring-2 ring-offset-1 ring-primary/50' : '',
            ]"
            @click="selectIssue(issue.id, true)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] font-medium">{{ levelLabel(issue.severity) }} · {{ issue.ruleId }}</span>
              <span v-if="issue.fixable" class="badge badge-outline badge-xs">可修复</span>
            </div>
            <p class="text-xs mt-1">{{ issue.message }}</p>
            <p class="text-[11px] opacity-80 mt-1">目标：{{ issue.targetIds.join(', ') }}</p>
            <div
              v-if="issue.meta?.flowUnclosed?.pathIds?.length"
              class="mt-2 flex flex-wrap items-center gap-1"
            >
              <span class="text-[11px] opacity-70">路径：</span>
              <button
                v-for="(nodeId, index) in issue.meta.flowUnclosed.pathIds"
                :key="`${issue.id}-${nodeId}-${index}`"
                class="badge badge-outline badge-xs"
                @click.stop="emits('focusPathNode', { issueId: issue.id, nodeId })"
              >
                {{ nodeId }}
              </button>
            </div>
            <div class="mt-2" v-if="issue.fixable">
              <button class="btn btn-xs" @click.stop="emits('fixIssue', issue.id)">修复此问题</button>
              <button class="btn btn-xs ml-1" @click.stop="emits('fixNext', issue.id)">修复并下一条</button>
            </div>
            <div class="mt-2" v-else>
              <button
                class="btn btn-xs btn-ghost"
                @click.stop="emits('fixRule', issue.ruleId)"
              >
                尝试修复同类规则
              </button>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
