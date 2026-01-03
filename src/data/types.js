/**
 * @typedef {Object} LevelQuest
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {number} [objectiveCount]
 * @property {string[]} [objectiveItemIds]
 * @property {string} [completionNote]
 */

/**
 * @typedef {Object} LineCondition
 * @property {string} [flag] State flag to compare on the interaction state.
 * @property {boolean} [equals] Expected value for the flag (defaults to true).
 * @property {string} [questComplete] Quest ID that must be completed.
 * @property {string} [questIncomplete] Quest ID that must be unfinished.
 * @property {string} [hasItem] Inventory item ID the player must carry.
 */

/**
 * @typedef {Object} RewardActions
 * @property {boolean} [unlockGate]
 * @property {boolean} [clearObjectives]
 * @property {string} [setAreaName]
 * @property {number} [setLevelNumber]
 * @property {string} [setSubtitle]
 */

/**
 * @typedef {Object} RewardConfig
 * @property {string} id
 * @property {{ id: string, name: string, icon: string, tint?: string, objective?: boolean, stackable?: boolean, quantity?: number }} [item]
 * @property {string} [note]
 * @property {string} [blockedDialogue]
 * @property {string} [blockedNote]
 * @property {RewardActions} [actions]
 */

/**
 * @typedef {Object} NpcScriptStep
 * @property {string} [id]
 * @property {string} dialogue
 * @property {LineCondition[]} [when]
 * @property {string} [note]
 * @property {string} [rewardId]
 * @property {Record<string, any>} [setState]
 */

/**
 * @typedef {Object} NpcScript
 * @property {string} [defaultDialogue]
 * @property {string} [infoNote]
 * @property {NpcScriptStep[]} [lines]
 */

/**
 * @typedef {Object} InteractableGate
 * @property {string} id
 * @property {number} tx
 * @property {number} ty
 * @property {boolean} [locked]
 * @property {number} [openTile]
 * @property {number[][]} [sealedTiles]
 * @property {string} [promptLocked]
 * @property {string} [promptUnlocked]
 * @property {string} [speaker]
 * @property {string} [unlockLine]
 * @property {string} [consumeNote]
 */

/**
 * @typedef {Object} Interactables
 * @property {InteractableGate} [gate]
 * @property {Array<{ id: string, name: string, tx: number, ty: number, lights: Array<{ x: number, y: number, w: number, h: number }> }>} [switches]
 */

/**
 * @typedef {Object} LevelMeta
 * @property {string} [id]
 * @property {string} name
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {number} [levelNumber]
 */

/**
 * @typedef {Object} LevelConfig
 * @property {LevelMeta} meta
 * @property {number[]} map
 * @property {number[]} [unlockedMap]
 * @property {{ litZones?: Array<{ x: number, y: number, w: number, h: number }>, switches?: Array<{ id: string, name: string, tx: number, ty: number, lights: Array<{ x: number, y: number, w: number, h: number }> }> }} [lighting]
 * @property {{ playerStart?: { x: number, y: number }, monsters?: any[], props?: any[], npcs?: any[] }} actors
 * @property {Array<{ id: string, name: string, icon: string, x?: number, y?: number, tx?: number, ty?: number, tint?: string, description?: string, objective?: boolean, stackable?: boolean, quantity?: number }>} pickups
 * @property {LevelQuest[]} [quests]
 * @property {Record<string, NpcScript>} [npcScripts]
 * @property {Interactables} [interactables]
 * @property {Record<string, RewardConfig>} [rewards]
 */

export {};
