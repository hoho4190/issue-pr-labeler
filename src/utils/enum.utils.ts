// ============================================================================
// 🔹 Public
// ============================================================================

/**
 * Get the enum key by its value.
 * Throws an error if the value does not exist.
 */
export function getEnumKeyByValue<TEnum extends Record<string, string | number>>(
  enumObj: TEnum,
  value: string | number
): keyof TEnum {
  const key = (Object.keys(enumObj) as (keyof TEnum)[]).find((k) => enumObj[k] === value)
  if (!key) {
    throw new Error(`Invalid enum value. Received: "${value}"`)
  }
  return key
}

/**
 * Get the enum value by its value.
 * Throws an error if the value does not exist.
 */
export function getEnumValueByValue<TEnum extends Record<string, string | number>>(
  enumObj: TEnum,
  value: string | number
): TEnum[keyof TEnum] {
  const key = getEnumKeyByValue(enumObj, value)
  return enumObj[key]
}

/**
 * Get the enum entry (key and value) by its value.
 * Throws an error if the value does not exist.
 */
export function getEnumEntryByValue<TEnum extends Record<string, string | number>>(
  enumObj: TEnum,
  value: string | number
): { key: keyof TEnum; value: TEnum[keyof TEnum] } {
  const key = getEnumKeyByValue(enumObj, value)
  return { key, value: enumObj[key] }
}
