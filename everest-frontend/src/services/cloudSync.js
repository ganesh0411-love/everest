const BASE_URL = 'https://everest-ledger-default-rtdb.firebaseio.com/accounts';

const sanitizeEmail = (email) => {
  return email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
};

/**
 * Saves all master queues and ledger arrays to the cloud.
 */
export const saveToCloud = async (email, data) => {
  if (!email) return null;
  const key = sanitizeEmail(email);
  try {
    const res = await fetch(`${BASE_URL}/${key}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error("Cloud save failed");
    return await res.json();
  } catch (err) {
    console.error("CloudSync Save Error:", err);
    return null;
  }
};

/**
 * Loads all master queues and ledger arrays from the cloud.
 */
export const loadFromCloud = async (email) => {
  if (!email) return null;
  const key = sanitizeEmail(email);
  try {
    const res = await fetch(`${BASE_URL}/${key}.json`);
    if (!res.ok) throw new Error("Cloud load failed");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("CloudSync Load Error:", err);
    return null;
  }
};
