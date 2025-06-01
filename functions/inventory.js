// got tired of calling the same thing over and over again

const supabase = require("../lib/supabase");
const usersTable = process.env.SUPABASE_USERS_TABLE;

function check(arr) {
  if (!Array.isArray(arr)) return false;
  for (const item of arr) {
    if (
      typeof item !== "object" ||
      typeof item.item !== "string" ||
      typeof item.qty !== "number" ||
      !Number.isFinite(item.qty) ||
      item.qty < 0
    ) {
      return false;
    }
  }
  return true;
}

/**
 * pull inventory from supabase
 * @param {string} userId
 * @returns {Promise<Array>} inventory
 */
async function getInv(userId) {
  if (!userId || typeof userId !== "string") {
    console.error(`[inv] getInv: invalid userId`, userId);
    return [];
  }

  try {
    const { data, error } = await supabase.from(usersTable).select("inventory").eq("slack_uid", userId).single();
    if (error) {
      console.error(`[inv] getInv error:`, error);
      return [];
    }
    if (!data) {
      console.warn(`[inv] getInv: no data for userId`, userId);
      return [];
    }

    let inv = data.inventory;
    if (!inv) {
      console.warn(`[inv] getInv: null/undefined inventory for userId`, userId);
      return [];
    }

    if (!check(inv)) {
      console.error(`[inv] getInv: invalid inventory format for userId`, userId, inv);
      // plz fix
      if (Array.isArray(inv)) {
        inv = inv.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.item === "string" &&
            typeof item.qty === "number" &&
            Number.isFinite(item.qty) &&
            item.qty >= 0,
        );
        if (check(inv)) {
          console.log(`[inv] getInv: cleaned invalid inventory for userId`, userId);
          await supabase.from(usersTable).update({ inventory: inv }).eq("slack_uid", userId);
          return inv;
        }
      }
      return [];
    }

    return inv;
  } catch (err) {
    console.error(`[inv] getInv unexpected error:`, err);
    return [];
  }
}

/**
 * add item to inventory
 * @param {string} userId
 * @param {Array|Object} items - single item or array of items
 * @returns {Promise<Array>} updated inventory
 */
async function addItems(userId, items) {
  console.log(`[inv] addItems called for userId:`, userId, "items:", items);
  if (!userId || typeof userId !== "string") {
    console.error(`[inv] addItems: invalid userId`, userId);
    return [];
  }
  if (!items || (Array.isArray(items) && items.length === 0)) {
    console.warn(`[inv] addItems: no items provided`, items);
    return await getInv(userId);
  }

  try {
    const inventory = await getInv(userId);
    const originalInventory = JSON.parse(JSON.stringify(inventory));
    const newItems = Array.isArray(items) ? items : [items];

    for (const newItem of newItems) {
      if (
        !newItem ||
        typeof newItem.item !== "string" ||
        !newItem.item.trim() ||
        typeof newItem.qty !== "number" ||
        !Number.isFinite(newItem.qty) ||
        newItem.qty <= 0
      ) {
        console.error(`[inv] addItems: invalid item format`, newItem);
        continue;
      }
      const idx = inventory.findIndex((i) => i.item === newItem.item);
      if (idx !== -1) {
        inventory[idx].qty = Math.round(((inventory[idx].qty || 0) + newItem.qty) * 100) / 100;
        console.log(`[inv] addItems: updated qty for`, newItem.item, "to", inventory[idx].qty);
      } else {
        inventory.push({ item: newItem.item, qty: Math.round(newItem.qty * 100) / 100 });
        console.log(`[inv] addItems: added new item`, newItem.item, "qty", newItem.qty);
      }
    }

    if (!check(inventory)) {
      console.error(`[inv] addItems: resulting inventory invalid`, inventory);
      return originalInventory;
    }

    const { error } = await supabase.from(usersTable).update({ inventory }).eq("slack_uid", userId);
    if (error) {
      console.error(`[inv] addItems update error:`, error);
      return originalInventory;
    }

    return inventory;
  } catch (err) {
    console.error(`[inv] addItems unexpected error:`, err);
    return await getInv(userId); // Return current state on error
  }
}

/**
 * remove item from inventory
 * @param {string} userId
 * @param {Array|Object} items - single item or array of items
 * @returns {Promise<Array>} updated inventory
 */
async function takeItems(userId, items) {
  console.log(`[inv] takeItems called for userId:`, userId, "items:", items);
  if (!userId || typeof userId !== "string") {
    console.error(`[inv] takeItems: invalid userId`, userId);
    return [];
  }
  if (!items || (Array.isArray(items) && items.length === 0)) {
    console.warn(`[inv] takeItems: no items provided`, items);
    return await getInv(userId);
  }

  try {
    const inventory = await getInv(userId);
    const originalInventory = JSON.parse(JSON.stringify(inventory)); // in case of rollback
    const removeList = Array.isArray(items) ? items : [items];

    for (const rem of removeList) {
      if (
        !rem ||
        typeof rem.item !== "string" ||
        !rem.item.trim() ||
        typeof rem.qty !== "number" ||
        !Number.isFinite(rem.qty) ||
        rem.qty <= 0
      ) {
        console.error(`[inv] takeItems: invalid item format`, rem);
        return originalInventory;
      }

      const idx = inventory.findIndex((i) => i.item === rem.item);
      if (idx === -1) {
        console.warn(`[inv] takeItems: item not found`, rem.item);
        return originalInventory;
      }

      if (inventory[idx].qty < rem.qty) {
        console.warn(
          `[inv] takeItems: insufficient quantity for ${rem.item}. Have: ${inventory[idx].qty}, Need: ${rem.qty}`,
        );
        return originalInventory;
      }
    }

    for (const rem of removeList) {
      const idx = inventory.findIndex((i) => i.item === rem.item);
      if (idx !== -1) {
        inventory[idx].qty = Math.round((inventory[idx].qty - rem.qty) * 100) / 100;
        console.log(`[inv] takeItems: updated qty for`, rem.item, "to", inventory[idx].qty);
        if (inventory[idx].qty <= 0) {
          inventory.splice(idx, 1);
          console.log(`[inv] takeItems: removed item`, rem.item);
        }
      }
    }

    if (!check(inventory)) {
      console.error(`[inv] takeItems: resulting inventory invalid`, inventory);
      return originalInventory;
    }

    const { error } = await supabase.from(usersTable).update({ inventory }).eq("slack_uid", userId);
    if (error) {
      console.error(`[inv] takeItems update error:`, error);
      return originalInventory;
    }

    return inventory;
  } catch (err) {
    console.error(`[inv] takeItems unexpected error:`, err);
    return await getInv(userId);
  }
}

/**
 * check if user has x amount of item
 * @param {string} userId
 * @param {Array|Object} items - single or array of item to check
 * @returns {Promise<boolean>} true if user passes check
 */
async function hasItems(userId, items) {
  try {
    const inventory = await getInv(userId);
    const checkList = Array.isArray(items) ? items : [items];

    for (const item of checkList) {
      if (
        !item ||
        typeof item.item !== "string" ||
        !item.item.trim() ||
        typeof item.qty !== "number" ||
        !Number.isFinite(item.qty) ||
        item.qty <= 0
      ) {
        console.error(`[inv] hasItems: invalid format`, item);
        return false;
      }

      const idx = inventory.findIndex((i) => i.item === item.item);
      if (idx === -1 || inventory[idx].qty < item.qty) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error(`[inv] hasItems error:`, err);
    return false;
  }
}

module.exports = {
  getInv,
  addItems,
  takeItems,
  hasItems,
};
