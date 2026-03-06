/**
 * Validation utilities for B³ Auction App.
 * Returns null if valid, or an error message string if invalid.
 */

const MIN_BASE_PRICE = 20_000; // ₹20,000 minimum
const MIN_BUDGET = 10_00_000; // ₹10,00,000 (10 Lakhs)
const MIN_BID_INCREMENT = 1_00_000; // ₹1,00,000 (1 Lakh)

/** Validate player base price in rupees. Min ₹20,000. */
export function validateBasePrice(price: number): string | null {
  if (!price || Number.isNaN(price)) {
    return "Base price is required.";
  }
  if (price <= 0) {
    return "Base price must be a positive number.";
  }
  if (price < MIN_BASE_PRICE) {
    return `Base price must be at least ₹${MIN_BASE_PRICE.toLocaleString("en-IN")} (₹20,000).`;
  }
  return null;
}

/** Validate team budget in rupees. Min ₹10,00,000. */
export function validateBudget(budget: number): string | null {
  if (!budget || Number.isNaN(budget)) {
    return "Budget is required.";
  }
  if (budget <= 0) {
    return "Budget must be a positive number.";
  }
  if (budget < MIN_BUDGET) {
    return `Budget must be greater than ₹${MIN_BUDGET.toLocaleString("en-IN")} (₹10 Lakhs).`;
  }
  return null;
}

/** Validate bid increment in rupees. Min ₹1,00,000. */
export function validateBidIncrement(increment: number): string | null {
  if (!increment || Number.isNaN(increment)) {
    return "Bid increment is required.";
  }
  if (increment <= 0) {
    return "Bid increment must be a positive number.";
  }
  if (increment < MIN_BID_INCREMENT) {
    return `Bid increment must be at least ₹${MIN_BID_INCREMENT.toLocaleString("en-IN")} (₹1 Lakh).`;
  }
  return null;
}

/** Validate squad size range. Min and max must be 11–25, max >= min. */
export function validateSquadSize(min: number, max: number): string | null {
  if (!min || Number.isNaN(min) || !max || Number.isNaN(max)) {
    return "Both min and max squad size are required.";
  }
  if (min < 11 || min > 25) {
    return "Minimum squad size must be between 11 and 25.";
  }
  if (max < 11 || max > 25) {
    return "Maximum squad size must be between 11 and 25.";
  }
  if (max < min) {
    return "Maximum squad size must be greater than or equal to minimum squad size.";
  }
  return null;
}

/** Validate player name. Must be non-empty. */
export function validatePlayerName(name: string): string | null {
  if (!name || !name.trim()) {
    return "Player name is required.";
  }
  if (name.trim().length < 2) {
    return "Player name must be at least 2 characters.";
  }
  if (name.trim().length > 100) {
    return "Player name must be 100 characters or less.";
  }
  return null;
}

/** Validate team name. Must be non-empty. */
export function validateTeamName(name: string): string | null {
  if (!name || !name.trim()) {
    return "Team name is required.";
  }
  if (name.trim().length < 2) {
    return "Team name must be at least 2 characters.";
  }
  if (name.trim().length > 60) {
    return "Team name must be 60 characters or less.";
  }
  return null;
}
