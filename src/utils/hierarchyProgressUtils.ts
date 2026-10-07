import { WorkItem } from '../types';
import { getItemLevel } from './numberingUtils';

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates effective calculation weight for a leaf item
 */
export function getItemCalculationWeight(item: WorkItem): number {
  if (item.weightFactor !== undefined && item.weightFactor !== null && item.weightFactor > 0) {
    return item.weightFactor;
  }
  if (item.weightKg !== undefined && item.weightKg !== null && item.weightKg > 0) {
    return item.weightKg;
  }
  if (item.qty && item.unitPrice && item.qty > 0 && item.unitPrice > 0) {
    return item.qty * item.unitPrice;
  }
  return 1; // Standard uniform weight
}

/**
 * Finds all sub-systems and components directly or indirectly belonging to an Area (Level 1)
 */
export function getAreaDescendants(area: WorkItem, allItems: WorkItem[]): {
  subSystems: WorkItem[];
  components: WorkItem[];
  allDescendants: WorkItem[];
} {
  const catItems = allItems.filter((i) => i.categoryId === area.categoryId && i.id !== area.id);
  
  // 1. Find Sub-systems (Level 2)
  const subSystems = catItems.filter((item) => {
    const lvl = getItemLevel(item, allItems);
    if (lvl !== 2) return false;
    return (
      item.parentId === area.id ||
      (item.itemNo && area.itemNo && item.itemNo.startsWith(`${area.itemNo}.`))
    );
  });

  const subSystemIds = new Set(subSystems.map((s) => s.id));

  // 2. Find Components (Level 3)
  const components = catItems.filter((item) => {
    const lvl = getItemLevel(item, allItems);
    if (lvl !== 3) return false;
    return (
      item.parentId === area.id ||
      (item.parentId && subSystemIds.has(item.parentId)) ||
      (item.itemNo && area.itemNo && item.itemNo.startsWith(`${area.itemNo}.`))
    );
  });

  return {
    subSystems,
    components,
    allDescendants: [...subSystems, ...components],
  };
}

/**
 * Finds all components belonging to a Sub-System (Level 2)
 */
export function getSubSystemComponents(sub: WorkItem, allItems: WorkItem[]): WorkItem[] {
  const catItems = allItems.filter((i) => i.categoryId === sub.categoryId && i.id !== sub.id);
  return catItems.filter((item) => {
    const lvl = getItemLevel(item, allItems);
    if (lvl !== 3) return false;
    return (
      item.parentId === sub.id ||
      (item.itemNo && sub.itemNo && item.itemNo.startsWith(`${sub.itemNo}.`))
    );
  });
}

/**
 * Finds the parent Sub-System (Level 2) of a Component (Level 3)
 */
export function getComponentParentSubSystem(comp: WorkItem, allItems: WorkItem[]): WorkItem | undefined {
  const catItems = allItems.filter((i) => i.categoryId === comp.categoryId);
  
  // Check explicit parentId first
  if (comp.parentId) {
    const parent = catItems.find((i) => i.id === comp.parentId);
    if (parent && getItemLevel(parent, allItems) === 2) {
      return parent;
    }
  }

  // Infer from itemNo dot structure (e.g. comp "1.2.3" -> sub "1.2")
  if (comp.itemNo && comp.itemNo.includes('.')) {
    const parts = comp.itemNo.split('.');
    if (parts.length >= 3) {
      const subNo = `${parts[0]}.${parts[1]}`;
      const parent = catItems.find((i) => i.itemNo === subNo && getItemLevel(i, allItems) === 2);
      if (parent) return parent;
    }
  }

  return undefined;
}

/**
 * Finds the parent Area (Level 1) of any Sub-System or Component
 */
export function getParentArea(item: WorkItem, allItems: WorkItem[]): WorkItem | undefined {
  const catItems = allItems.filter((i) => i.categoryId === item.categoryId);
  const lvl = getItemLevel(item, allItems);

  if (lvl === 1) return item;

  // If item is Level 2 Sub-System
  if (lvl === 2) {
    if (item.parentId) {
      const parent = catItems.find((i) => i.id === item.parentId);
      if (parent && getItemLevel(parent, allItems) === 1) {
        return parent;
      }
    }
    if (item.itemNo && item.itemNo.includes('.')) {
      const areaNo = item.itemNo.split('.')[0];
      const parent = catItems.find((i) => i.itemNo === areaNo && getItemLevel(i, allItems) === 1);
      if (parent) return parent;
    }
  }

  // If item is Level 3 Component
  if (lvl === 3) {
    // Try via parent sub-system first
    const sub = getComponentParentSubSystem(item, allItems);
    if (sub) {
      const area = getParentArea(sub, allItems);
      if (area) return area;
    }

    // Direct parent check
    if (item.parentId) {
      const parent = catItems.find((i) => i.id === item.parentId);
      if (parent && getItemLevel(parent, allItems) === 1) {
        return parent;
      }
    }

    // Dot prefix check (e.g. comp "1.2.3" -> area "1")
    if (item.itemNo && item.itemNo.includes('.')) {
      const areaNo = item.itemNo.split('.')[0];
      const parent = catItems.find((i) => i.itemNo === areaNo && getItemLevel(i, allItems) === 1);
      if (parent) return parent;
    }
  }

  return undefined;
}

/**
 * Computes weighted average progress of a collection of leaf items
 */
export function computeGroupProgress(items: WorkItem[]): number {
  if (items.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedProgressSum = 0;

  items.forEach((item) => {
    const w = getItemCalculationWeight(item);
    const p = item.progressPercent !== undefined ? item.progressPercent : item.isCompleted ? 100 : 0;
    totalWeight += w;
    weightedProgressSum += p * w;
  });

  if (totalWeight <= 0) return 0;
  const avg = weightedProgressSum / totalWeight;
  return Number(avg.toFixed(1));
}

/**
 * Primary Bi-Directional Synchronizer:
 * When an item at ANY structure level has its progress updated:
 * 1. If Area (Level 1) is updated -> Cascades DOWN to all Sub-systems and Components under that Area.
 * 2. If Sub-System (Level 2) is updated -> Cascades DOWN to its Components AND rolls UP to its Parent Area.
 * 3. If Component (Level 3) is updated -> Updates Component AND rolls UP to its Sub-System AND Parent Area.
 *
 * Returns the modified items array (ready for batch update) and the complete updated list.
 */
export function syncWorkItemsProgressHierarchy(
  allItems: WorkItem[],
  targetItem: WorkItem,
  newProgress: number
): {
  updatedAllItems: WorkItem[];
  modifiedItems: WorkItem[];
} {
  const clampedProgress = Math.max(0, Math.min(100, Number(newProgress) || 0));
  const isCompleted = clampedProgress >= 100;
  const todayIso = formatDateToIso(new Date());

  const itemMap = new Map<string, WorkItem>(allItems.map((i) => [i.id, { ...i }]));
  const modifiedMap = new Map<string, WorkItem>();

  const targetLevel = getItemLevel(targetItem, allItems);

  // Helper to update a work item in the maps
  const applyItemProgress = (id: string, pct: number, extraAction?: string) => {
    const current = itemMap.get(id);
    if (!current) return;
    const p = Math.max(0, Math.min(100, pct));
    const comp = p >= 100;
    const realizedQty = current.qty ? Number(((current.qty * p) / 100).toFixed(2)) : undefined;

    const updated: WorkItem = {
      ...current,
      progressPercent: p,
      progressQty: realizedQty,
      isCompleted: comp,
      progressDate: todayIso,
      updatedAction: 'progress_updated' as const,
    };

    itemMap.set(id, updated);
    modifiedMap.set(id, updated);
  };

  if (targetLevel === 1) {
    // ==========================================
    // LEVEL 1 (AREA) UPDATED -> CASCADE DOWN TO ALL
    // ==========================================
    applyItemProgress(targetItem.id, clampedProgress);

    const { subSystems, components } = getAreaDescendants(targetItem, allItems);
    
    // Update all Sub-systems under this Area
    subSystems.forEach((sub) => {
      applyItemProgress(sub.id, clampedProgress);
    });

    // Update all Components under this Area
    components.forEach((comp) => {
      applyItemProgress(comp.id, clampedProgress);
    });

  } else if (targetLevel === 2) {
    // =========================================================
    // LEVEL 2 (SUB-SYSTEM) UPDATED -> CASCADE DOWN & ROLL UP
    // =========================================================
    applyItemProgress(targetItem.id, clampedProgress);

    // 1. Cascade down to child components of this sub-system
    const subComponents = getSubSystemComponents(targetItem, allItems);
    subComponents.forEach((comp) => {
      applyItemProgress(comp.id, clampedProgress);
    });

    // 2. Roll up to parent Area
    const parentArea = getParentArea(targetItem, allItems);
    if (parentArea) {
      const currentAreaItems = Array.from(itemMap.values()).filter((i) => i.categoryId === parentArea.categoryId);
      const { components: allAreaComps, subSystems: allAreaSubs } = getAreaDescendants(parentArea, currentAreaItems);
      
      // If there are leaf components in this Area, calculate Area average from all leaf components
      let areaProgress: number;
      if (allAreaComps.length > 0) {
        areaProgress = computeGroupProgress(allAreaComps);
      } else if (allAreaSubs.length > 0) {
        areaProgress = computeGroupProgress(allAreaSubs);
      } else {
        areaProgress = clampedProgress;
      }

      applyItemProgress(parentArea.id, areaProgress);
    }

  } else {
    // ===================================================
    // LEVEL 3 (COMPONENT) UPDATED -> ROLL UP TO SUB & AREA
    // ===================================================
    applyItemProgress(targetItem.id, clampedProgress);

    // 1. Roll up to parent Sub-System (if any)
    const parentSub = getComponentParentSubSystem(targetItem, allItems);
    if (parentSub) {
      const currentSubComps = getSubSystemComponents(parentSub, Array.from(itemMap.values()));
      const subProgress = computeGroupProgress(currentSubComps);
      applyItemProgress(parentSub.id, subProgress);
    }

    // 2. Roll up to parent Area (if any)
    const parentArea = getParentArea(targetItem, allItems);
    if (parentArea) {
      const currentAreaItems = Array.from(itemMap.values()).filter((i) => i.categoryId === parentArea.categoryId);
      const { components: allAreaComps, subSystems: allAreaSubs } = getAreaDescendants(parentArea, currentAreaItems);
      
      let areaProgress: number;
      if (allAreaComps.length > 0) {
        areaProgress = computeGroupProgress(allAreaComps);
      } else if (allAreaSubs.length > 0) {
        areaProgress = computeGroupProgress(allAreaSubs);
      } else {
        areaProgress = clampedProgress;
      }

      applyItemProgress(parentArea.id, areaProgress);
    }
  }

  const updatedAllItems = allItems.map((item) => itemMap.get(item.id) || item);
  const modifiedItems = Array.from(modifiedMap.values());

  return {
    updatedAllItems,
    modifiedItems,
  };
}

/**
 * Re-evaluates and synchronizes progress across all hierarchy levels in the entire project
 * so Area and Sub-System nodes accurately reflect the weighted average of their child components.
 */
export function recalculateProjectHierarchyProgress(allItems: WorkItem[]): WorkItem[] {
  const itemMap = new Map<string, WorkItem>(allItems.map((i) => [i.id, { ...i }]));

  // 1. Group by category
  const categories = Array.from(new Set(allItems.map((i) => i.categoryId)));

  categories.forEach((catId) => {
    const catItems = allItems.filter((i) => i.categoryId === catId);
    
    // Level 1 Areas
    const areas = catItems.filter((i) => getItemLevel(i, catItems) === 1);
    // Level 2 Sub-systems
    const subSystems = catItems.filter((i) => getItemLevel(i, catItems) === 2);

    // First recalculate each sub-system from its components
    subSystems.forEach((sub) => {
      const comps = getSubSystemComponents(sub, catItems);
      if (comps.length > 0) {
        const subProgress = computeGroupProgress(comps);
        const isComp = subProgress >= 100;
        const current = itemMap.get(sub.id);
        if (current) {
          itemMap.set(sub.id, {
            ...current,
            progressPercent: subProgress,
            isCompleted: isComp,
          });
        }
      }
    });

    // Next recalculate each Area from all its leaf components
    areas.forEach((area) => {
      const currentCatItems = Array.from(itemMap.values()).filter((i) => i.categoryId === catId);
      const { components: areaComps, subSystems: areaSubs } = getAreaDescendants(area, currentCatItems);

      let areaProgress: number;
      if (areaComps.length > 0) {
        areaProgress = computeGroupProgress(areaComps);
      } else if (areaSubs.length > 0) {
        areaProgress = computeGroupProgress(areaSubs);
      } else {
        areaProgress = area.progressPercent || 0;
      }

      const isAreaComp = areaProgress >= 100;
      const current = itemMap.get(area.id);
      if (current) {
        itemMap.set(area.id, {
          ...current,
          progressPercent: areaProgress,
          isCompleted: isAreaComp,
        });
      }
    });
  });

  return allItems.map((i) => itemMap.get(i.id) || i);
}
