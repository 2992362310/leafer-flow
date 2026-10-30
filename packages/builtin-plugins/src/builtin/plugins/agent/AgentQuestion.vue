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
    <form class="space-y-2 min-w-0 text-xs" @submit.prevent="submit">
        <fieldset class="min-w-0 space-y-1">
            <legend class="font-semibold mb-2 break-words w-full">{{ question.question }}</legend>
            <label v-for="option in question.options" :key="option"
                class="flex items-start gap-2 px-2 py-1.5 hover:bg-base-200 cursor-pointer min-w-0">
                <input :type="question.multiple ? 'checkbox' : 'radio'" :name="groupId" :value="option"
                    :checked="selected.includes(option)"
                    :class="question.multiple ? 'checkbox checkbox-xs' : 'radio radio-xs'" class="shrink-0 mt-0.5"
                    @change="selectOption(option)" />
                <span class="min-w-0 break-words">{{ option }}</span>
            </label>
        </fieldset>
        <textarea v-model="text" class="textarea textarea-bordered textarea-xs w-full resize-none" rows="2"
            maxlength="2000" placeholder="其他回答或补充内容" aria-label="其他回答或补充内容"></textarea>
        <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-xs" @click="emit('cancel')">取消任务</button>
            <button type="submit" class="btn btn-primary btn-xs" :disabled="!canSubmit">确认回答</button>
        </div>
    </form>
</template>
