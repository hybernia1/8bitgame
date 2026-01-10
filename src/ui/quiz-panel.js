import { runActions } from '../core/actions.js';
import { format } from './messages.js';

function getQuizDomRefs(root) {
  if (!root) return {};
  return {
    quizPanel: root.querySelector('[data-quiz-panel]'),
    quizTitle: root.querySelector('[data-quiz-title]'),
    quizQuestion: root.querySelector('[data-quiz-question]'),
    quizOptions: root.querySelector('[data-quiz-options]'),
    quizFeedback: root.querySelector('[data-quiz-feedback]'),
    quizCancel: root.querySelector('[data-quiz-cancel]'),
  };
}

export function createQuizPanel({ documentRoot } = {}) {
  const refs = getQuizDomRefs(documentRoot);
  let activeQuiz = null;
  let dependencies = {
    inventory: null,
    renderInventory: null,
    level: null,
    game: null,
    hud: null,
    ammo: null,
    persistentState: null,
    sessionState: null,
    state: null,
    clearDialogueState: null,
    hideInteraction: null,
  };

  const setQuizFeedback = (messageId, params) => {
    if (!refs.quizFeedback) return;
    if (!messageId) {
      refs.quizFeedback.textContent = '';
      return;
    }
    refs.quizFeedback.textContent = format(messageId, params);
  };

  const clearQuizOptions = () => {
    if (!refs.quizOptions) return;
    refs.quizOptions.innerHTML = '';
  };

  const hideQuizPanel = () => {
    if (refs.quizPanel) {
      refs.quizPanel.classList.add('hidden');
      refs.quizPanel.setAttribute('aria-hidden', 'true');
    }
    if (dependencies.sessionState) {
      dependencies.sessionState.activeQuiz = null;
    }
    activeQuiz = null;
    setQuizFeedback();
    clearQuizOptions();
  };

  const applyQuizStateChanges = (nextState = {}) => {
    if (!dependencies.persistentState?.flags) return;
    Object.entries(nextState).forEach(([key, value]) => {
      dependencies.persistentState.flags[key] = value;
    });
  };

  const applyQuizActions = (step) => {
    if (!step?.actions && !step?.rewardId) return { success: true, note: step?.note };
    const rewards = dependencies.level?.getRewards?.();
    const reward = step.rewardId ? rewards?.[step.rewardId] : undefined;
    const baseActions = Array.isArray(step.actions) ? step.actions : step.actions ? [step.actions] : [];
    const rewardActions = reward?.actions ?? [];
    const actions = [...baseActions, ...rewardActions];
    if (!actions.length) {
      return { success: true, note: reward?.note ?? step?.note };
    }
    const result = runActions(
      actions,
      {
        inventory: dependencies.inventory,
        renderInventory: dependencies.renderInventory,
        ammo: dependencies.ammo,
        level: dependencies.level,
        game: dependencies.game,
        hud: dependencies.hud,
        flags: dependencies.persistentState?.flags,
        persistentState: dependencies.persistentState,
        sessionState: dependencies.sessionState,
        state: dependencies.state,
      },
      reward,
    );
    if (result.success !== false && reward?.note && !result.note) {
      result.note = reward.note;
    }
    return result;
  };

  const showQuizPanel = (payload = {}) => {
    const quiz = payload.quiz ?? payload.line?.quiz;
    if (!refs.quizPanel || !quiz || !refs.quizQuestion || !refs.quizOptions) return;
    activeQuiz = {
      ...payload,
      quiz,
    };
    if (dependencies.sessionState) {
      dependencies.sessionState.activeQuiz = { id: payload.line?.id ?? payload.npc?.id ?? 'quiz' };
    }
    refs.quizPanel.classList.remove('hidden');
    refs.quizPanel.setAttribute('aria-hidden', 'false');
    if (refs.quizTitle) {
      refs.quizTitle.textContent = payload.npc?.name ?? 'Kvíz';
    }
    refs.quizQuestion.textContent = quiz.question ?? '';
    clearQuizOptions();
    quiz.options?.forEach((option, index) => {
      const button = documentRoot?.createElement?.('button');
      if (!button) return;
      button.type = 'button';
      button.className = 'menu-button';
      button.dataset.quizOption = String(index);
      button.textContent = option.label ?? '';
      refs.quizOptions.appendChild(button);
    });
    setQuizFeedback();
  };

  const handleQuizAnswer = (index) => {
    if (!activeQuiz) return;
    const quiz = activeQuiz.quiz ?? {};
    const option = quiz.options?.[index];
    if (!option) return;
    if (!option.correct) {
      setQuizFeedback(quiz.failureNote ?? 'note.quiz.wrong');
      return;
    }
    const actionResult = applyQuizActions(activeQuiz.line);
    if (actionResult.success === false) {
      setQuizFeedback(actionResult.blockedNote ?? quiz.failureNote ?? 'note.quiz.inventoryFull');
      return;
    }
    if (activeQuiz.line?.setState) {
      applyQuizStateChanges(activeQuiz.line.setState);
    }
    const note = actionResult.note ?? quiz.successNote ?? activeQuiz.line?.note;
    if (note) {
      dependencies.hud?.showNote?.(note);
    }
    hideQuizPanel();
    dependencies.clearDialogueState?.();
    dependencies.hideInteraction?.();
  };

  const handleQuizOptionClick = (event) => {
    const target = event?.target?.closest?.('[data-quiz-option]');
    if (!target) return;
    const index = Number.parseInt(target.dataset.quizOption ?? '-1', 10);
    if (!Number.isFinite(index)) return;
    handleQuizAnswer(index);
  };

  const handleQuizCancelClick = (event) => {
    event?.preventDefault?.();
    hideQuizPanel();
    dependencies.clearDialogueState?.();
    dependencies.hideInteraction?.();
  };

  const handleQuizStart = (payload) => {
    if (dependencies.sessionState?.activeQuiz) return;
    showQuizPanel(payload);
  };

  const init = (nextDependencies = {}) => {
    dependencies = { ...dependencies, ...nextDependencies };
    refs.quizOptions?.addEventListener?.('click', handleQuizOptionClick);
    refs.quizCancel?.addEventListener?.('click', handleQuizCancelClick);
  };

  const cleanup = () => {
    refs.quizOptions?.removeEventListener?.('click', handleQuizOptionClick);
    refs.quizCancel?.removeEventListener?.('click', handleQuizCancelClick);
    hideQuizPanel();
  };

  return {
    init,
    cleanup,
    hide: hideQuizPanel,
    handleQuizStart,
  };
}
