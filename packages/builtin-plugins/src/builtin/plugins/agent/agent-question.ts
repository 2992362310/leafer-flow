export interface UserQuestion {
    question: string;
    options: string[];
    multiple: boolean;
}

export interface UserAnswer {
    selected: string[];
    text: string;
}

export interface AgentToolContext {
    askUser?: (question: UserQuestion) => Promise<UserAnswer>;
}

export async function waitForUserAnswer(
    question: UserQuestion,
    callback: (question: UserQuestion, signal: AbortSignal) => Promise<UserAnswer>,
    signal: AbortSignal,
): Promise<UserAnswer> {
    signal.throwIfAborted();
    let onAbort: () => void = () => undefined;
    const aborted = new Promise<UserAnswer>((_resolve, reject) => {
        onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
    });
    try {
        return await Promise.race([
            Promise.resolve().then(() => { signal.throwIfAborted(); return callback(question, signal); }),
            aborted,
        ]);
    } finally {
        signal.removeEventListener("abort", onAbort);
    }
}

export function validateUserAnswer(question: UserQuestion, answer: UserAnswer): UserAnswer {
    if (
        !answer || !Array.isArray(answer.selected) ||
        answer.selected.some((option) => !question.options.includes(option)) ||
        new Set(answer.selected).size !== answer.selected.length ||
        (!question.multiple && answer.selected.length > 1) ||
        typeof answer.text !== "string" || answer.text.length > 2000 ||
        (!answer.selected.length && !answer.text.trim())
    ) throw new Error("请选择有效选项或填写回答（最多 2000 字）。");
    return { selected: [...answer.selected], text: answer.text.trim() };
}
