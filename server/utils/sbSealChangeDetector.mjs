/**
 * Helper to normalize strings for comparison
 */
const norm = (s) => String(s || "").trim().toUpperCase();

/**
 * Check if container seal numbers have changed between two lists of containers
 */
export function hasContainerSealChanged(oldContainers, newContainers) {
  const oldList = Array.isArray(oldContainers) ? oldContainers : [];
  const newList = Array.isArray(newContainers) ? newContainers : [];

  // Create maps of seal numbers for comparison
  const oldMap = {};
  oldList.forEach((c) => {
    if (c.containerNo) {
      oldMap[norm(c.containerNo)] = {
        customSealNo: norm(c.customSealNo),
        shippingLineSealNo: norm(c.shippingLineSealNo),
        sealNo: norm(c.sealNo)
      };
    }
  });

  const newMap = {};
  newList.forEach((c) => {
    if (c.containerNo) {
      newMap[norm(c.containerNo)] = {
        customSealNo: norm(c.customSealNo),
        shippingLineSealNo: norm(c.shippingLineSealNo),
        sealNo: norm(c.sealNo)
      };
    }
  });

  const oldNos = Object.keys(oldMap);
  const newNos = Object.keys(newMap);

  // 1. Compare new vs old
  for (const no of newNos) {
    const oldSeals = oldMap[no];
    const newSeals = newMap[no];
    if (oldSeals) {
      if (
        oldSeals.customSealNo !== newSeals.customSealNo ||
        oldSeals.shippingLineSealNo !== newSeals.shippingLineSealNo ||
        oldSeals.sealNo !== newSeals.sealNo
      ) {
        return true;
      }
    } else {
      // New container added with seal number
      if (newSeals.customSealNo || newSeals.shippingLineSealNo || newSeals.sealNo) {
        return true;
      }
    }
  }

  // 2. Compare if any deleted container had seal numbers
  for (const no of oldNos) {
    if (!newMap[no]) {
      const oldSeals = oldMap[no];
      if (oldSeals.customSealNo || oldSeals.shippingLineSealNo || oldSeals.sealNo) {
        return true;
      }
    }
  }

  // 3. Fallback for index-by-index comparison if container numbers are not specified
  if (oldNos.length === 0 && newNos.length === 0) {
    if (oldList.length !== newList.length) {
      const oldSealsStr = oldList.map(c => norm(c.customSealNo) + '|' + norm(c.shippingLineSealNo) + '|' + norm(c.sealNo)).join(',');
      const newSealsStr = newList.map(c => norm(c.customSealNo) + '|' + norm(c.shippingLineSealNo) + '|' + norm(c.sealNo)).join(',');
      if (oldSealsStr !== newSealsStr) return true;
    } else {
      for (let i = 0; i < oldList.length; i++) {
        const c = oldList[i];
        const orig = newList[i];
        if (orig && (
          norm(c.customSealNo) !== norm(orig.customSealNo) ||
          norm(c.shippingLineSealNo) !== norm(orig.shippingLineSealNo) ||
          norm(c.sealNo) !== norm(orig.sealNo)
        )) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if container seal numbers have changed and a seal number was already available (not empty)
 */
export function hasAvailableSealChanged(oldContainers, newContainers) {
  const oldList = Array.isArray(oldContainers) ? oldContainers : [];
  const newList = Array.isArray(newContainers) ? newContainers : [];

  // Create maps of seal numbers for comparison by containerNo
  const oldMap = {};
  oldList.forEach((c) => {
    if (c.containerNo) {
      oldMap[norm(c.containerNo)] = {
        customSealNo: norm(c.customSealNo),
        shippingLineSealNo: norm(c.shippingLineSealNo),
        sealNo: norm(c.sealNo)
      };
    }
  });

  const newMap = {};
  newList.forEach((c) => {
    if (c.containerNo) {
      newMap[norm(c.containerNo)] = {
        customSealNo: norm(c.customSealNo),
        shippingLineSealNo: norm(c.shippingLineSealNo),
        sealNo: norm(c.sealNo)
      };
    }
  });

  const oldNos = Object.keys(oldMap);

  for (const no of oldNos) {
    const oldSeals = oldMap[no];
    const newSeals = newMap[no];
    
    // Check if container seal no is available in old container
    const oldCustom = oldSeals.customSealNo;
    const oldShipping = oldSeals.shippingLineSealNo;
    const oldSeal = oldSeals.sealNo;
    const hasOldSeal = oldCustom !== "" || oldShipping !== "" || oldSeal !== "";

    if (hasOldSeal && newSeals) {
      const newCustom = newSeals.customSealNo;
      const newShipping = newSeals.shippingLineSealNo;
      const newSeal = newSeals.sealNo;
      
      // If the user changed any of the available seals to a different value
      if (
        (oldCustom !== "" && oldCustom !== newCustom) ||
        (oldShipping !== "" && oldShipping !== newShipping) ||
        (oldSeal !== "" && oldSeal !== newSeal)
      ) {
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
        const oldShipping = norm(oldC.shippingLineSealNo);
        const oldSeal = norm(oldC.sealNo);
        const hasOldSeal = oldCustom !== "" || oldShipping !== "" || oldSeal !== "";
        
        if (hasOldSeal) {
          const newCustom = norm(newC.customSealNo);
          const newShipping = norm(newC.shippingLineSealNo);
          const newSeal = norm(newC.sealNo);
          if (
            (oldCustom !== "" && oldCustom !== newCustom) ||
            (oldShipping !== "" && oldShipping !== newShipping) ||
            (oldSeal !== "" && oldSeal !== newSeal)
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

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
 * Main detector to see if SB or seal changed after there was an SB number in the job
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

  // 3. Check containers (array)
  if (!changed && incomingUpdates.containers !== undefined) {
    if (hasContainerSealChanged(existingJob.containers, incomingUpdates.containers)) {
      changed = true;
      if (hasAvailableSealChanged(existingJob.containers, incomingUpdates.containers)) {
        detailMsg = `the seal is opened for one day`;
      } else {
        detailMsg = `Container Seal No was updated`;
      }
    }
  }

  // 4. Check nested keys (fields patch)
  if (!changed) {
    for (const key of Object.keys(incomingUpdates)) {
      if (key.startsWith("containers.") || key.startsWith("containers[")) {
        if (key.includes("customSealNo") || key.includes("shippingLineSealNo") || key.includes("sealNo") || key.includes("custom_seal") || key.includes("line_seal")) {
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
