const activeEvents = new Map();

/**
 * Checks if a user is currently in an active event.
 * @param {string} userId - The user's Discord ID.
 * @param {string|null} eventType - The type of event to check for (optional).
 * @returns {boolean} True if the user is in an active event (or the specified event type), false otherwise.
 */
function isUserInEvent(userId, eventType = null) {
  if (!activeEvents.has(userId)) return false;
  if (eventType === null) return true; // Check for any event
  return activeEvents.get(userId).includes(eventType); // Check for a specific event type
}

/**
 * Starts tracking an event for a user.
 * @param {string} userId - The user's Discord ID.
 * @param {string} eventType - The type of event (e.g., "fishing", "fishmarket").
 */
function startEvent(userId, eventType) {
  if (!activeEvents.has(userId)) {
    activeEvents.set(userId, [eventType]);
  } else {
    const userEvents = activeEvents.get(userId);
    if (!userEvents.includes(eventType)) {
      userEvents.push(eventType);
      activeEvents.set(userId, userEvents);
    }
  }
}

/**
 * Ends tracking an event for a user.
 * @param {string} userId - The user's Discord ID.
 * @param {string|null} eventType - The type of event to end (optional). If null, ends all events for the user.
 */
function endEvent(userId, eventType = null) {
  if (!activeEvents.has(userId)) return;

  if (eventType === null) {
    // Remove all events for the user
    activeEvents.delete(userId);
  } else {
    // Remove only the specified event type
    const userEvents = activeEvents.get(userId).filter(event => event !== eventType);
    if (userEvents.length === 0) {
      activeEvents.delete(userId); // No more events, remove the user
    } else {
      activeEvents.set(userId, userEvents);
    }
  }
}

/**
 * Gets all the events a user is currently in.
 * @param {string} userId - The user's Discord ID.
 * @returns {Array<string>} An array of event types the user is currently in, or an empty array if none.
 */
function getUserEvents(userId) {
  return activeEvents.get(userId) || [];
}

module.exports = {
  isUserInEvent,
  startEvent,
  endEvent,
  getUserEvents,
};