/**
 * Oracle Helper Utilities
 * Formatting and utility functions for oracle data display
 */

/**
 * Format wallet address for display
 * @param {string} address - Full wallet address
 * @param {number} startChars - Number of characters to show at start (default: 6)
 * @param {number} endChars - Number of characters to show at end (default: 4)
 * @returns {string} Formatted address like "0x1234...5678"
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address || address.length < startChars + endChars) {
    return address || "Unknown";
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Calculate and format days since last activity
 * @param {number} lastActivityTimestamp - Unix timestamp in seconds
 * @returns {string} Formatted string like "2 days ago" or "Never"
 */
export function formatDaysSinceActivity(lastActivityTimestamp) {
  if (!lastActivityTimestamp || lastActivityTimestamp === 0) {
    return "Never";
  }

  const now = Math.floor(Date.now() / 1000);
  const seconds = now - lastActivityTimestamp;
  const days = Math.floor(seconds / (24 * 60 * 60));

  if (days === 0) {
    const hours = Math.floor(seconds / 3600);
    if (hours === 0) {
      const minutes = Math.floor(seconds / 60);
      return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
    }
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else if (days === 1) {
    return "1 day ago";
  } else if (days < 30) {
    return `${days} days ago`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  } else {
    const years = Math.floor(days / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  }
}

/**
 * Determine activity status based on last activity and threshold
 * @param {number} daysSinceActivity - Days since last activity
 * @param {number} threshold - Activity threshold in days (default: 90)
 * @returns {object} Status object with isActive, badge text, and color
 */
export function getActivityStatus(daysSinceActivity, threshold = 90) {
  if (daysSinceActivity === -1) {
    return {
      isActive: false,
      badge: "No Activity",
      color: "gray",
      icon: "⚪",
    };
  }

  const isActive = daysSinceActivity <= threshold;

  return {
    isActive,
    badge: isActive ? "Active" : "Inactive",
    color: isActive ? "green" : "red",
    icon: isActive ? "✅" : "⚠️",
  };
}

/**
 * Format voting power for display
 * @param {string|number} power - Voting power (can be BigInt string)
 * @returns {string} Formatted power like "10.5K" or "2.3M"
 */
export function formatVotingPower(power) {
  if (!power || power === "0") {
    return "0";
  }

  try {
    // Convert to number (handle both string and number inputs)
    const num = typeof power === "string" ? parseFloat(power) : power;
    
    // Divide by 10^18 if it seems like wei amount
    const value = num > 1e15 ? num / 1e18 : num;

    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    } else if (value >= 1) {
      return value.toFixed(1);
    } else {
      return value.toFixed(4);
    }
  } catch (error) {
    console.error("Error formatting voting power:", error);
    return "0";
  }
}

/**
 * Format stake amount for display
 * @param {string|number} amount - Stake amount in wei
 * @returns {string} Formatted amount like "100 OW" or "1.5K OW"
 */
export function formatStakeAmount(amount) {
  if (!amount || amount === "0") {
    return "0 OW";
  }

  try {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    const value = num / 1e18; // Convert from wei to OW tokens

    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M OW`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K OW`;
    } else if (value >= 1) {
      return `${value.toFixed(1)} OW`;
    } else {
      return `${value.toFixed(4)} OW`;
    }
  } catch (error) {
    console.error("Error formatting stake amount:", error);
    return "0 OW";
  }
}

/**
 * Get color for resolution accuracy percentage
 * @param {number} percentage - Accuracy percentage (0-100)
 * @returns {string} Color code for the percentage
 */
export function getAccuracyColor(percentage) {
  if (percentage >= 90) {
    return "#00C853"; // Green
  } else if (percentage >= 75) {
    return "#FFA726"; // Orange
  } else if (percentage >= 50) {
    return "#FF9800"; // Dark Orange
  } else {
    return "#F44336"; // Red
  }
}

/**
 * Get status badge styling based on accuracy
 * @param {number} accuracy - Accuracy percentage
 * @returns {object} Badge styling object
 */
export function getAccuracyBadge(accuracy) {
  if (accuracy >= 90) {
    return { text: "Excellent", color: "#00C853", icon: "🏆" };
  } else if (accuracy >= 75) {
    return { text: "Good", color: "#66BB6A", icon: "👍" };
  } else if (accuracy >= 50) {
    return { text: "Average", color: "#FFA726", icon: "👌" };
  } else if (accuracy > 0) {
    return { text: "Poor", color: "#F44336", icon: "⚠️" };
  } else {
    return { text: "No Data", color: "#9E9E9E", icon: "❓" };
  }
}

/**
 * Sort members by specified criteria
 * @param {Array} members - Array of member objects
 * @param {string} sortBy - Sort criteria: 'activity', 'power', 'accuracy', 'name'
 * @param {string} order - Sort order: 'asc' or 'desc' (default: 'desc')
 * @returns {Array} Sorted array of members
 */
export function sortMembers(members, sortBy, order = "desc") {
  const sorted = [...members];

  const compareFn = (a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case "activity":
        // Most recent first (lower daysSinceActivity is better)
        compareValue = (a.daysSinceActivity || Infinity) - (b.daysSinceActivity || Infinity);
        break;

      case "power":
        // Highest power first
        const powerA = parseFloat(a.votingPower || "0");
        const powerB = parseFloat(b.votingPower || "0");
        compareValue = powerB - powerA;
        break;

      case "accuracy":
        // Highest accuracy first
        compareValue = (b.accuracy || 0) - (a.accuracy || 0);
        break;

      case "name":
        // Alphabetical by address
        compareValue = (a.address || "").localeCompare(b.address || "");
        break;

      case "oracle":
        // Alphabetical by oracle name
        compareValue = (a.oracle || "").localeCompare(b.oracle || "");
        break;

      default:
        compareValue = 0;
    }

    return order === "asc" ? compareValue : -compareValue;
  };

  return sorted.sort(compareFn);
}

/**
 * Filter members by criteria
 * @param {Array} members - Array of member objects
 * @param {object} filters - Filter criteria object
 * @returns {Array} Filtered array of members
 */
export function filterMembers(members, filters = {}) {
  let filtered = [...members];

  // Filter by oracle
  if (filters.oracle && filters.oracle !== "all") {
    filtered = filtered.filter(m => m.oracle === filters.oracle);
  }

  // Filter by activity status
  if (filters.status && filters.status !== "all") {
    if (filters.status === "active") {
      filtered = filtered.filter(m => m.isActive);
    } else if (filters.status === "inactive") {
      filtered = filtered.filter(m => !m.isActive);
    }
  }

  // Filter by minimum accuracy
  if (filters.minAccuracy !== undefined) {
    filtered = filtered.filter(m => m.accuracy >= filters.minAccuracy);
  }

  // Filter by search term (address)
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(m =>
      m.address.toLowerCase().includes(term) ||
      m.oracle.toLowerCase().includes(term)
    );
  }

  return filtered;
}

/**
 * Calculate percentage for progress bar
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(value, max) {
  if (!max || max === 0) return 0;
  return Math.min(Math.round((value / max) * 100), 100);
}

/**
 * Format date for display
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return "N/A";

  const dateObj = date instanceof Date ? date : new Date(date * 1000);

  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get oracle status indicator
 * @param {boolean} isActive - Whether oracle is active
 * @param {number} activeMemberCount - Number of active members
 * @param {number} minRequired - Minimum members required
 * @returns {object} Status indicator object
 */
export function getOracleStatusIndicator(isActive, activeMemberCount, minRequired = 3) {
  if (isActive && activeMemberCount >= minRequired) {
    return {
      status: "Active",
      color: "#00C853",
      icon: "✅",
      message: `${activeMemberCount} active members`,
    };
  } else if (activeMemberCount > 0 && activeMemberCount < minRequired) {
    return {
      status: "Insufficient Members",
      color: "#FFA726",
      icon: "⚠️",
      message: `Only ${activeMemberCount}/${minRequired} active members`,
    };
  } else {
    return {
      status: "Inactive",
      color: "#F44336",
      icon: "❌",
      message: "No active members",
    };
  }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) {
    return text || "";
  }
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Export members data to CSV format
 * @param {Array} members - Array of member objects
 * @returns {string} CSV formatted string
 */
export function exportToCSV(members) {
  if (!members || members.length === 0) {
    return "";
  }

  // CSV headers
  const headers = [
    "Address",
    "Oracle",
    "Status",
    "Voting Power",
    "Stake Amount",
    "Last Activity",
    "Days Since Activity",
    "Resolution Accuracy",
    "Total Votes",
    "Can Vote",
  ];

  // Convert members to CSV rows
  const rows = members.map(m => [
    m.address,
    m.oracle,
    m.isActive ? "Active" : "Inactive",
    formatVotingPower(m.votingPower),
    formatStakeAmount(m.stakeAmount),
    formatDaysSinceActivity(m.lastActivityTimestamp),
    m.daysSinceActivity,
    `${m.accuracy}%`,
    m.totalVotes,
    m.canVote ? "Yes" : "No",
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename = "oracle_members.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} Whether address is valid
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get member summary statistics
 * @param {Array} members - Array of member objects
 * @returns {object} Summary statistics
 */
export function getMemberStatistics(members) {
  if (!members || members.length === 0) {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      withVotingHistory: 0,
      averageAccuracy: 0,
      averageDaysSinceActivity: 0,
    };
  }

  const active = members.filter(m => m.isActive).length;
  const withHistory = members.filter(m => m.hasVotingHistory);
  
  const avgAccuracy = withHistory.length > 0
    ? Math.round(withHistory.reduce((sum, m) => sum + m.accuracy, 0) / withHistory.length)
    : 0;

  const membersWithActivity = members.filter(m => m.daysSinceActivity >= 0);
  const avgDays = membersWithActivity.length > 0
    ? Math.round(membersWithActivity.reduce((sum, m) => sum + m.daysSinceActivity, 0) / membersWithActivity.length)
    : 0;

  return {
    total: members.length,
    active,
    inactive: members.length - active,
    withVotingHistory: withHistory.length,
    averageAccuracy: avgAccuracy,
    averageDaysSinceActivity: avgDays,
  };
}
