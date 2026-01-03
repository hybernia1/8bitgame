const questTypeRegistry = new Map();

export function registerQuestType(type, evaluator) {
  if (!type || typeof evaluator !== 'function') return;
  questTypeRegistry.set(type, evaluator);
}

export function prepareQuestState(configs = [], questState = {}) {
  configs.forEach((quest) => {
    if (!quest?.id) return;
    if (!questState[quest.id]) {
      questState[quest.id] = {
        id: quest.id,
        completed: false,
        progress: { current: 0, total: quest.objectiveCount ?? quest.objectiveItemIds?.length ?? 0 },
      };
    } else if (!questState[quest.id].progress) {
      questState[quest.id].progress = { current: 0, total: quest.objectiveCount ?? quest.objectiveItemIds?.length ?? 0 };
    }
  });
  return questState;
}

function getHandler(type) {
  return questTypeRegistry.get(type) || questTypeRegistry.get('collect');
}

export function evaluateQuestBatch(configs = [], questState = {}, context = {}) {
  const completed = [];
  configs.forEach((quest) => {
    if (!quest?.id) return;
    const entry = questState[quest.id] ?? (questState[quest.id] = { id: quest.id, completed: false });
    const handler = getHandler(quest.type);
    const result = handler(quest, { ...context, questState: entry }) || {};
    const progress = result.progress ?? {
      current: result.progressCurrent ?? entry.progress?.current ?? 0,
      total: result.progressTotal ?? quest.objectiveCount ?? quest.objectiveItemIds?.length ?? entry.progress?.total ?? 0,
    };

    entry.progress = progress;

    if (!entry.completed && result.completed) {
      entry.completed = true;
      completed.push({ quest, note: quest.completionNote || result.note });
    }
  });

  return { completed };
}

export function getActiveQuestSummary(configs = [], questState = {}) {
  const activeQuest = configs.find((quest) => quest && !questState[quest.id]?.completed) ?? configs[configs.length - 1];
  if (!activeQuest) return null;
  const entry = questState[activeQuest.id] ?? {};
  const progress = entry.progress ?? { current: 0, total: activeQuest.objectiveCount ?? 0 };
  const progressText = progress.total ? `${progress.current}/${progress.total}` : undefined;

  return {
    id: activeQuest.id,
    title: activeQuest.name ?? activeQuest.id,
    description: activeQuest.description ?? '',
    progress,
    progressText,
    completed: entry.completed === true,
  };
}

function registerDefaults() {
  registerQuestType('collect', (quest, { objectivesCollected = 0, inventory }) => {
    let current = objectivesCollected;
    let total = quest.objectiveCount ?? 0;

    if (quest.objectiveItemIds?.length) {
      current = quest.objectiveItemIds.filter((id) => (inventory?.getItemCount?.(id) ?? 0) > 0).length;
      total = quest.objectiveItemIds.length;
    }

    return {
      completed: total > 0 ? current >= total : false,
      progress: { current, total },
      note: current >= total ? quest.completionNote : undefined,
    };
  });

  registerQuestType('defeat', (quest, { flags = {} }) => {
    const total = quest.objectiveCount ?? quest.targetCount ?? 0;
    const current = flags[quest.progressFlag] ?? 0;
    return {
      completed: total > 0 ? current >= total : false,
      progress: { current, total },
    };
  });

  registerQuestType('escort', (quest, { flags = {} }) => {
    const completedFlag = flags[quest.completedFlag ?? quest.progressFlag];
    return {
      completed: completedFlag === true,
      progress: { current: completedFlag ? 1 : 0, total: 1 },
    };
  });
}

registerDefaults();
