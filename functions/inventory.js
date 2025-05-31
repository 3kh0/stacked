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
  const { data, error } = await supabase.from(usersTable).select("inventory").eq("slack_uid", userId).single();
  if (error) console.error(`[inv] getInv error:`, error);
  if (!data) {
    console.warn(`[inv] getInv: no data for userId`, userId);
    return [];
  }
  let inv = data.inventory;
  if (!check(inv)) {
    console.error(`[inv] getInv: invalid inventory format for userId`, userId, inv);
    return [];
  }
  return inv;
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
  const inventory = await getInv(userId);
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
      inventory[idx].qty = (inventory[idx].qty || 0) + newItem.qty;
      console.log(`[inv] addItems: updated qty for`, newItem.item, "to", inventory[idx].qty);
    } else {
      inventory.push({ item: newItem.item, qty: newItem.qty });
      console.log(`[inv] addItems: added new item`, newItem.item, "qty", newItem.qty);
    }
  }
  if (!check(inventory)) {
    console.error(`[inv] addItems: resulting inventory invalid`, inventory);
    return [];
  }
  const { error } = await supabase.from(usersTable).update({ inventory }).eq("slack_uid", userId);
  if (error) console.error(`[inv] addItems update error:`, error);
  return inventory;
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
  const inventory = await getInv(userId);
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
      continue;
    }
    const idx = inventory.findIndex((i) => i.item === rem.item);
    if (idx !== -1) {
      inventory[idx].qty -= rem.qty;
      console.log(`[inv] takeItems: updated qty for`, rem.item, "to", inventory[idx].qty);
      if (inventory[idx].qty <= 0) {
        inventory.splice(idx, 1);
        console.log(`[inv] takeItems: removed item`, rem.item);
      }
    } else {
      console.warn(`[inv] takeItems: item not found`, rem.item);
    }
  }
  if (!check(inventory)) {
    console.error(`[inv] takeItems: resulting inventory invalid`, inventory);
    return [];
  }
  const { error } = await supabase.from(usersTable).update({ inventory }).eq("slack_uid", userId);
  if (error) console.error(`[inv] takeItems update error:`, error);
  return inventory;
}

module.exports = {
  getInv,
  addItems,
  takeItems,
};
