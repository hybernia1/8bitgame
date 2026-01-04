/**
 * @typedef {Object} LevelQuest
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {'collect'|'defeat'|'escort'} [type]
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
 * @typedef {Object} ActionDefinition
 * @property {string} type
 * @property {Record<string, any>} [item]
 * @property {string} [note]
 * @property {string} [targetId]
 * @property {string} [flag]
 * @property {boolean|number|string} [value]
 * @property {string} [blockedDialogue]
 * @property {string} [blockedNote]
 */

/**
 * @typedef {Object} RewardConfig
 * @property {string} id
 * @property {string} [note]
 * @property {string} [blockedDialogue]
 * @property {string} [blockedNote]
 * @property {ActionDefinition[]} [actions]
 */

/**
 * @typedef {Object} NpcScriptStep
 * @property {string} [id]
 * @property {string} dialogue
 * @property {LineCondition[]} [when]
 * @property {string} [note]
 * @property {string} [rewardId]
 * @property {Record<string, any>} [setState]
 * @property {ActionDefinition[]} [actions]
 */

/**
 * @typedef {Object} NpcScript
 * @property {string} [defaultDialogue]
 * @property {string} [infoNote]
 * @property {NpcScriptStep[]} [lines]
 */

/**
 * @typedef {Record<string, NpcScript>} NpcScriptCollection
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
 * @typedef {Object} InteractablePressureSwitch
 * @property {string} id
 * @property {number} tx
 * @property {number} ty
 * @property {Array<{ tx: number, ty: number }>} targets
 * @property {number} [openTile]
 * @property {number} [closedTile]
 * @property {string} [name]
 */

/**
 * @typedef {Object} Interactables
 * @property {InteractableGate} [gate]
 * @property {Array<{ id: string, name: string, tx: number, ty: number, lights: Array<{ x: number, y: number, w: number, h: number }> }>} [switches]
 * @property {InteractablePressureSwitch[]} [pressureSwitches]
 */

/**
 * @typedef {Object} LevelMeta
 * @property {string} [id]
 * @property {string} name
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {number} [levelNumber]
 * @property {{ width: number, height: number }} [dimensions] Native/original map dimensions before any padding.
 */

/**
 * @typedef {Object} TileDefinition
 * @property {number} tileId Numeric identifier used in level layers.
 * @property {'wall'|'floor'|'door'|'decor'} category
 * @property {string} id Stable identifier, e.g. "wall_window".
 * @property {string} [variant] Optional sprite/variant label for rendering.
 * @property {string} [spriteKey] Optional animation key used to pick a sprite-sheet frame.
 * @property {boolean} [blocksMovement] Whether entities can move through this tile.
 * @property {boolean} [transparent] Whether the tile should be treated as see-through (e.g. window).
 * @property {{ mask?: 'glow'|'windowCone', color?: string, intensity?: number, radius?: number, length?: number, spread?: number, offsetY?: number }} [lighting]
 */

/**
 * @typedef {Object} TileLayers
 * @property {number[]} collision
 * @property {number[]} [collisionUnlocked]
 * @property {number[]} decor
 * @property {number[]} [decorUnlocked]
 */

/**
 * @typedef {Object} LevelConfig
 * @property {LevelMeta} meta
 * @property {{ width: number, height: number }} [dimensions]
 * @property {number} [width]
 * @property {number} [height]
 * @property {TileLayers} [tileLayers]
 * @property {number[]} [map]
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
