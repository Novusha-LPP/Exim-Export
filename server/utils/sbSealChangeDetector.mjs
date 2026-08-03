/**
 * Helper to normalize strings for comparison
 */
const norm = (s) => String(s || "").trim().toUpperCase();

/**
 * Helper to check if a job is Factory Stuffed
 */
export function isFactoryStuffedJob(job = {}, incomingUpdates = {}) {
  const val = String(
    incomingUpdates.goods_stuffed_at ??
    incomingUpdates.goods_stuffed ??
    job.goods_stuffed_at ??
    job.goods_stuffed ??
    ""
  ).toUpperCase().trim();

  if (!val) return false;

  return (
    val.includes("FACTORY") ||
    val === "F" ||
    val === "YES" ||
    val === "TRUE" ||
    val === "Y"
  );
}

/**
 * Check if custom seal numbers have changed between two lists of containers
 * (Only customSealNo is checked; shippingLineSealNo and sealNo are ignored)
 */
export function hasCustomSealChanged(oldContainers, newContainers) {
  const oldList = Array.isArray(oldContainers) ? oldContainers : [];
  const newList = Array.isArray(newContainers) ? newContainers : [];

  const oldMap = {};
  oldList.forEach((c) => {
    if (c && c.containerNo) {
      oldMap[norm(c.containerNo)] = norm(c.customSealNo);
    }
  });

  const newMap = {};
  newList.forEach((c) => {
    if (c && c.containerNo) {
      newMap[norm(c.containerNo)] = norm(c.customSealNo);
    }
  });

  const oldNos = Object.keys(oldMap);
  const newNos = Object.keys(newMap);

  // 1. Compare new vs old customSealNo
  for (const no of newNos) {
    const oldCustom = oldMap[no];
    const newCustom = newMap[no];
    if (oldCustom !== undefined) {
      if (oldCustom !== newCustom) {
        return true;
      }
    } else {
      // New container added with custom seal number
      if (newCustom !== "") {
        return true;
      }
    }
  }

  // 2. Compare if any deleted container had a custom seal number
  for (const no of oldNos) {
    if (newMap[no] === undefined) {
      if (oldMap[no] !== "") {
        return true;
      }
    }
  }

  // 3. Fallback for index-by-index comparison if container numbers are not specified
  if (oldNos.length === 0 && newNos.length === 0) {
    if (oldList.length !== newList.length) {
      const oldCustomStr = oldList.map(c => norm(c?.customSealNo)).join(',');
      const newCustomStr = newList.map(c => norm(c?.customSealNo)).join(',');
      if (oldCustomStr !== newCustomStr) return true;
    } else {
      for (let i = 0; i < oldList.length; i++) {
        const c = oldList[i];
        const orig = newList[i];
        if (orig && norm(c?.customSealNo) !== norm(orig?.customSealNo)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if custom seal number was already available (not empty) and has changed
 */
export function hasAvailableCustomSealChanged(oldContainers, newContainers) {
  const oldList = Array.isArray(oldContainers) ? oldContainers : [];
  const newList = Array.isArray(newContainers) ? newContainers : [];

  const oldMap = {};
  oldList.forEach((c) => {
    if (c && c.containerNo) {
      oldMap[norm(c.containerNo)] = norm(c.customSealNo);
    }
  });

  const newMap = {};
  newList.forEach((c) => {
    if (c && c.containerNo) {
      newMap[norm(c.containerNo)] = norm(c.customSealNo);
    }
  });

  const oldNos = Object.keys(oldMap);

  for (const no of oldNos) {
    const oldCustom = oldMap[no];
    const newCustom = newMap[no];
    
    if (oldCustom !== "" && newCustom !== undefined) {
      if (oldCustom !== newCustom) {
        return true;
      }
    }
  }

  // Fallback for index-by-index comparison if container numbers are not specified
  if (oldNos.length === 0 && Object.keys(newMap).length === 0) {
    const minLen = Math.min(oldList.length, newList.length);
    for (let i = 0; i < minLen; i++) {
      const oldC = oldList[i];
      const newC = newList[i];
      if (oldC && newC) {
        const oldCustom = norm(oldC.customSealNo);
        const newCustom = norm(newC.customSealNo);
        if (oldCustom !== "" && oldCustom !== newCustom) {
          return true;
        }
      }
    }
  }

  return false;
}

// Backward compatibility exports
export const hasContainerSealChanged = hasCustomSealChanged;
export const hasAvailableSealChanged = hasAvailableCustomSealChanged;

/**
 * Get nested value by path
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, key) => {
    if (!o) return undefined;
    const match = key.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const arrayKey = match[1];
      const index = parseInt(match[2], 10);
      return o[arrayKey] ? o[arrayKey][index] : undefined;
    }
    return o[key];
  }, obj);
}

/**
 * Main detector to see if SB or custom seal changed after there was an SB number in the job
 */
export function detectSbOrSealChange(existingJob, incomingUpdates, username) {
  if (!existingJob || !existingJob.sb_no || String(existingJob.sb_no).trim() === "") {
    return null;
  }

  let changed = false;
  let detailMsg = "";

  // 1. Check sb_no
  if (incomingUpdates.sb_no !== undefined) {
    const oldSb = norm(existingJob.sb_no);
    const newSb = norm(incomingUpdates.sb_no);
    if (oldSb !== newSb && newSb !== "") {
      changed = true;
      detailMsg = `Shipping Bill No changed from ${existingJob.sb_no} to ${incomingUpdates.sb_no}`;
    }
  }

  // 2. Check sb_date
  if (!changed && incomingUpdates.sb_date !== undefined) {
    const oldDate = norm(existingJob.sb_date);
    const newDate = norm(incomingUpdates.sb_date);
    if (oldDate !== newDate && newDate !== "") {
      changed = true;
      detailMsg = `Shipping Bill Date changed from ${existingJob.sb_date || 'N/A'} to ${incomingUpdates.sb_date}`;
    }
  }

  // Check if job is Factory Stuffed
  const isFactoryStuffed = isFactoryStuffedJob(existingJob, incomingUpdates);

  // 3. Check containers (array) - ONLY IF FACTORY STUFFED and ONLY FOR CUSTOM SEAL NO
  if (!changed && isFactoryStuffed && incomingUpdates.containers !== undefined) {
    if (hasCustomSealChanged(existingJob.containers, incomingUpdates.containers)) {
      changed = true;
      if (hasAvailableCustomSealChanged(existingJob.containers, incomingUpdates.containers)) {
        detailMsg = `the seal is opened for one day`;
      } else {
        detailMsg = `Container Seal No was updated`;
      }
    }
  }

  // 4. Check nested keys (fields patch) - ONLY IF FACTORY STUFFED and ONLY FOR CUSTOM SEAL NO
  if (!changed && isFactoryStuffed) {
    for (const key of Object.keys(incomingUpdates)) {
      if (key.startsWith("containers.") || key.startsWith("containers[")) {
        if (
          (key.includes("customSealNo") || key.includes("custom_seal")) &&
          !key.includes("shippingLineSealNo") && !key.includes("line_seal")
        ) {
          const oldVal = norm(getNestedValue(existingJob, key));
          const newVal = norm(incomingUpdates[key]);
          if (oldVal !== newVal) {
            changed = true;
            if (oldVal !== "") {
              detailMsg = `the seal is opened for one day`;
            } else {
              detailMsg = `Container Seal No was updated`;
            }
            break;
          }
        }
      }
    }
  }

  if (changed) {
    return {
      sb_or_seal_changed_notif: true,
      sb_or_seal_changed_details: {
        changedBy: username || "System",
        changedAt: new Date(),
        message: detailMsg
      }
    };
  }

  return null;
}
