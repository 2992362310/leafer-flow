<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import type { UserAnswer, UserQuestion } from "./agent-question";

const props = defineProps<{ question: UserQuestion }>();
const emit = defineEmits<{ answer: [answer: UserAnswer]; cancel: [] }>();
const groupId = useId();
const selected = ref<string[]>([]);
const text = ref("");
const canSubmit = computed(() => selected.value.length > 0 || text.value.trim().length > 0);

watch(() => props.question, () => { selected.value = []; text.value = ""; });

function selectOption(option: string) {
    if (!props.question.multiple) selected.value = [option];
    else selected.value = selected.value.includes(option)
        ? selected.value.filter((item) => item !== option)
        : [...selected.value, option];
}

function submit() {
    if (canSubmit.value) emit("answer", { selected: [...selected.value], text: text.value });
}
</script>

<template>
    <form class="agent-question" @submit.prevent="submit">
        <div class="question-heading">
            <span>需要你的确认</span>
            <span class="question-mode">{{ question.multiple ? '多选' : '单选' }}</span>
        </div>
        <fieldset>
            <legend>{{ question.question }}</legend>
            <label v-for="option in question.options" :key="option" class="question-option"
                :class="{ 'question-option--selected': selected.includes(option) }">
                <input :type="question.multiple ? 'checkbox' : 'radio'" :name="groupId" :value="option"
                    :checked="selected.includes(option)" @change="selectOption(option)" />
                <span>{{ option }}</span>
            </label>
        </fieldset>
        <textarea v-model="text" rows="2" maxlength="2000" placeholder="其他回答或补充内容" aria-label="其他回答或补充内容"></textarea>
        <div class="question-actions">
            <button type="button" class="question-cancel" @click="emit('cancel')">取消任务</button>
            <button type="submit" class="question-submit" :disabled="!canSubmit">
                确认回答
                <Icon name="arrow-up" class="h-3.5 w-3.5 rotate-90" aria-hidden="true" />
            </button>
        </div>
    </form>
</template>

<style scoped>
.agent-question {
    min-width: 0;
    font-size: 12px;
    line-height: 1.65;
}

.question-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
    color: var(--agent-accent, #087b6b);
    font-size: 10px;
    font-weight: 600;
}

.question-mode {
    color: color-mix(in oklab, var(--color-base-content) 45%, transparent);
    font-weight: 400;
}

fieldset {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 6px;
}

legend {
    width: 100%;
    margin-bottom: 12px;
    padding: 0;
    font-size: 14px;
    font-weight: 600;
    overflow-wrap: anywhere;
}

.question-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    min-height: 40px;
    padding: 9px 11px;
    border: 1px solid var(--color-base-300);
    border-radius: 6px;
    background: var(--color-base-100);
    cursor: pointer;
    transition: border-color 150ms, background 150ms;
}

.question-option:hover {
    border-color: var(--agent-accent, #087b6b);
}

.question-option--selected {
    border-color: var(--agent-accent, #087b6b);
    background: color-mix(in oklab, var(--agent-accent, #087b6b) 5%, var(--color-base-100));
}

.question-option input {
    width: 14px;
    height: 14px;
    margin-top: 3px;
    flex-shrink: 0;
    accent-color: var(--agent-accent, #087b6b);
}

.question-option span {
    min-width: 0;
    overflow-wrap: anywhere;
}

textarea {
    display: block;
    width: 100%;
    min-height: 60px;
    padding: 9px 11px;
    margin-top: 10px;
    border: 1px solid var(--color-base-300);
    border-radius: 6px;
    background: var(--color-base-100);
    color: inherit;
    resize: vertical;
    font: inherit;
}

textarea::placeholder {
    color: color-mix(in oklab, var(--color-base-content) 40%, transparent);
}

textarea:focus {
    outline: none;
    border-color: var(--agent-accent, #087b6b);
}

.question-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
}

.question-actions button {
    min-height: 32px;
    border: 0;
    border-radius: 6px;
    padding: 6px 11px;
    font: inherit;
    cursor: pointer;
}

.question-cancel {
    background: transparent;
    color: color-mix(in oklab, var(--color-base-content) 55%, transparent);
}

.question-cancel:hover {
    background: var(--color-base-200);
    color: var(--color-base-content);
}

.question-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--agent-accent, #087b6b);
    color: var(--color-base-100);
    font-weight: 600 !important;
}

.question-submit:disabled {
    background: var(--color-base-200);
    color: color-mix(in oklab, var(--color-base-content) 35%, transparent);
    cursor: not-allowed;
}

button:focus-visible,
input:focus-visible {
    outline: 2px solid var(--agent-accent, #087b6b);
    outline-offset: 3px;
}
</style>
