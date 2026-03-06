#!/usr/bin/env node

/**
 * Validates all state JSON files in public/data/states/
 * Exits with code 1 if any validation errors are found.
 */

const fs = require('fs')
const path = require('path')

const STATES_DIR = path.join(__dirname, '..', 'public', 'data', 'states')

const VALID_STATUSES = ['illegal', 'possibly-illegal', 'legal']
const VALID_CATEGORIES = [
  'general', 'estate', 'residential', 'commercial',
  'industrial', 'agricultural', 'government', 'reserve'
]
const VALID_ISSUES = ['no-lot', 'wrong-zoning', 'restricted-area', 'other']

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'
]

let totalErrors = 0
let totalFiles = 0

function error(file, msg) {
  console.error(`  ❌ ${msg}`)
  totalErrors++
}

function validateMeta(file, meta) {
  if (!meta) {
    error(file, 'Missing "meta" object')
    return
  }
  if (!meta.state || typeof meta.state !== 'string') {
    error(file, 'meta.state must be a non-empty string')
  } else if (!MALAYSIAN_STATES.includes(meta.state)) {
    error(file, `meta.state "${meta.state}" is not a valid Malaysian state`)
  }

  // Check filename matches state
  const expectedName = meta.state?.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-')
  const actualName = path.basename(file, '.json')
  if (expectedName && actualName !== expectedName) {
    error(file, `Filename "${actualName}.json" does not match meta.state "${meta.state}" (expected "${expectedName}.json")`)
  }

  if (!meta.generated || typeof meta.generated !== 'string') {
    error(file, 'meta.generated must be a date string (YYYY-MM-DD)')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.generated)) {
    error(file, `meta.generated "${meta.generated}" is not in YYYY-MM-DD format`)
  }

  if (!meta.center || typeof meta.center !== 'object') {
    error(file, 'meta.center must be an object with { lat, lng, zoom }')
  } else {
    if (typeof meta.center.lat !== 'number' || meta.center.lat < -90 || meta.center.lat > 90) {
      error(file, `meta.center.lat must be a number between -90 and 90`)
    }
    if (typeof meta.center.lng !== 'number' || meta.center.lng < -180 || meta.center.lng > 180) {
      error(file, `meta.center.lng must be a number between -180 and 180`)
    }
    if (typeof meta.center.zoom !== 'number' || meta.center.zoom < 1 || meta.center.zoom > 20) {
      error(file, `meta.center.zoom must be a number between 1 and 20`)
    }
  }
}

function validateLocation(file, loc, index) {
  const prefix = `locations[${index}]`

  if (typeof loc.id !== 'number') {
    error(file, `${prefix}.id must be a number`)
  }
  if (!loc.name || typeof loc.name !== 'string') {
    error(file, `${prefix}.name must be a non-empty string`)
  }
  if (!loc.address || typeof loc.address !== 'string') {
    error(file, `${prefix}.address must be a non-empty string`)
  }
  if (!loc.district || typeof loc.district !== 'string') {
    error(file, `${prefix}.district must be a non-empty string`)
  }

  if (typeof loc.lat !== 'number' || loc.lat < -90 || loc.lat > 90) {
    error(file, `${prefix}.lat must be a number between -90 and 90`)
  }
  if (typeof loc.lng !== 'number' || loc.lng < -180 || loc.lng > 180) {
    error(file, `${prefix}.lng must be a number between -180 and 180`)
  }

  if (!VALID_STATUSES.includes(loc.status)) {
    error(file, `${prefix}.status "${loc.status}" must be one of: ${VALID_STATUSES.join(', ')}`)
  }
  if (!VALID_CATEGORIES.includes(loc.category)) {
    error(file, `${prefix}.category "${loc.category}" must be one of: ${VALID_CATEGORIES.join(', ')}`)
  }

  if (typeof loc.notes !== 'string') {
    error(file, `${prefix}.notes must be a string`)
  }

  if (!Array.isArray(loc.issues)) {
    error(file, `${prefix}.issues must be an array`)
  } else {
    loc.issues.forEach((issue, i) => {
      if (!VALID_ISSUES.includes(issue)) {
        error(file, `${prefix}.issues[${i}] "${issue}" must be one of: ${VALID_ISSUES.join(', ')}`)
      }
    })
  }
}

function validateFile(filePath) {
  const filename = path.basename(filePath)
  console.log(`\n📄 ${filename}`)

  let raw
  try {
    raw = fs.readFileSync(filePath, 'utf8')
  } catch (e) {
    error(filePath, `Cannot read file: ${e.message}`)
    return
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    error(filePath, `Invalid JSON: ${e.message}`)
    return
  }

  validateMeta(filePath, data.meta)

  if (!Array.isArray(data.locations)) {
    error(filePath, '"locations" must be an array')
    return
  }

  if (data.locations.length === 0) {
    console.log(`  ⏭️  Empty placeholder — skipped`)
    return
  }

  // Check unique IDs
  const ids = data.locations.map(l => l.id)
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (duplicateIds.length > 0) {
    error(filePath, `Duplicate IDs found: ${[...new Set(duplicateIds)].join(', ')}`)
  }

  // Validate each location
  const errorsBefore = totalErrors
  data.locations.forEach((loc, i) => validateLocation(filePath, loc, i))

  if (totalErrors === errorsBefore) {
    console.log(`  ✅ ${data.locations.length} locations — all valid`)
  }
}

// Main
if (!fs.existsSync(STATES_DIR)) {
  console.error('❌ States directory not found:', STATES_DIR)
  process.exit(1)
}

const files = fs.readdirSync(STATES_DIR).filter(f => f.endsWith('.json'))

if (files.length === 0) {
  console.error('❌ No JSON files found in', STATES_DIR)
  process.exit(1)
}

console.log(`🔍 Validating ${files.length} state file(s)...`)

files.forEach(file => {
  totalFiles++
  validateFile(path.join(STATES_DIR, file))
})

console.log(`\n${'─'.repeat(40)}`)
console.log(`Files: ${totalFiles} | Errors: ${totalErrors}`)

if (totalErrors > 0) {
  console.error(`\n❌ Validation failed with ${totalErrors} error(s)`)
  process.exit(1)
} else {
  console.log(`\n✅ All state data files are valid`)
}
