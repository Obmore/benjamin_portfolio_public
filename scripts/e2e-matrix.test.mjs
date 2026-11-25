import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

// .github/workflows/verify.yml selects every Playwright project by `--project=<name>` in exactly one job. A project added to
// playwright.config.ts or playwright.compat.config.ts later would otherwise silently not run in CI, and every Playwright container
// image tag in the workflow must match the @playwright/test version in package-lock.json.
//
// A job may be a matrix: `--project=${{ matrix.project }}` expands to the values of that key in the job's own `matrix:`, and a
// sharded selection `--shard=${{ matrix.shard }}/N` must cover exactly the shards 1..N. The parsing lives in functions that take
// strings, so the negative cases at the bottom can prove that every rule fails when it should.
const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const MAIN_CONFIG = 'playwright.config.ts'
const COMPAT_CONFIG = 'playwright.compat.config.ts'

// `//` comment lines are ignored; a key may start its line or follow `{` or `,`; both quote styles are accepted.
// A future setup project (named through `dependencies`) would count as regular here and would need handling.
const values = (key, text) => [...text.matchAll(new RegExp(`(?:^|[{,])\\s*${key}:\\s*(['"])([^'"]+)\\1`, 'gm'))].map((m) => m[2])
const projectNames = (configText) =>
  values(
    'name',
    configText
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n'),
  )

const normalizeConfig = (name) => name.replace(/^\.\//, '')
const unquote = (value) => value.replace(/^['"]|['"]$/g, '')

// The matrix of one job: { key: [values] }, plus the problems of every form this reader does not understand.
function parseMatrix(code) {
  const matrix = {}
  const problems = []
  const start = code.findIndex((line) => /^\s+matrix:\s*$/.test(line))
  if (start === -1) return { matrix, problems }
  const indent = code[start].match(/^(\s*)/)[1].length
  const body = []
  for (const line of code.slice(start + 1)) {
    if (line.trim() === '') continue
    if (line.match(/^(\s*)/)[1].length <= indent) break
    body.push(line)
  }
  const value = String.raw`['"]?[\w.-]+['"]?`
  for (let i = 0; i < body.length; i++) {
    const flow = body[i].match(new RegExp(String.raw`^\s+(\w+):\s*\[\s*(${value}(?:\s*,\s*${value})*)\s*,?\s*\]\s*$`))
    const block = body[i].match(/^\s+(\w+):\s*$/)
    if (flow) {
      matrix[flow[1]] = flow[2].split(',').map((v) => unquote(v.trim()))
    } else if (block) {
      const list = []
      while (i + 1 < body.length && new RegExp(String.raw`^\s+-\s*${value}\s*$`).test(body[i + 1])) list.push(unquote(body[++i].replace(/^\s+-\s*/, '').trim()))
      if (list.length) matrix[block[1]] = list
      else problems.push(`matrix key "${block[1]}" is not a flow list [a, b] or a block list of plain values`)
    } else {
      problems.push(`cannot read the matrix line "${body[i].trim()}" (only \`key: [a, b]\` and \`key:\` with \`- a\` items are supported)`)
    }
  }
  return { matrix, problems }
}

// Replaces `${{ matrix.<key> }}` in a token with each value of that key; a literal token gives itself.
function expand(token, matrix, problems, where) {
  const ref = token.match(/^\$\{\{\s*matrix\.(\w+)\s*\}\}$/)
  if (!ref) return [token]
  if (!matrix[ref[1]]) {
    problems.push(`${where} uses matrix.${ref[1]} but the job's matrix has no key "${ref[1]}"`)
    return []
  }
  return matrix[ref[1]]
}

// Joins backslash-continued lines, so `--project` and `--shard` split over two lines are read together. A line that starts a YAML key
// or a list item is never a shell continuation: a stray trailing backslash on a value must not glue the next key onto it.
const startsYaml = (line) => /^\s*(-\s|[\w.-]+:(\s|$))/.test(line)
const joinContinuations = (lines) =>
  lines.reduce((acc, line) => {
    if (acc.length && /\\\s*$/.test(acc[acc.length - 1].raw) && !startsYaml(line)) {
      acc[acc.length - 1] = { raw: line, text: `${acc[acc.length - 1].text.replace(/\\\s*$/, ' ')}${line.trim()}` }
    } else acc.push({ raw: line, text: line })
    return acc
  }, []).map((entry) => entry.text)

// The contract is one job per project; sharding is done only through that job's matrix (a manual split over two jobs is flagged on purpose).
// A job block is the text under a `jobs:` child with exactly two spaces of indentation (`  <id>:`, an optional trailing comment is fine).
function parseWorkflow(workflowText) {
  const jobsText = workflowText.slice(workflowText.search(/^jobs:\s*$/m))
  return jobsText
    .split('\n')
    .slice(1)
    .reduce((acc, line) => {
      const header = line.match(/^ {2}([\w-]+):\s*(#.*)?$/)
      if (header) acc.push({ id: header[1], lines: [] })
      else if (acc.length) acc[acc.length - 1].lines.push(line)
      return acc
    }, [])
    .map(({ id, lines }) => {
      // Only run steps count: a `--project=` in a comment does not select anything.
      const code = lines.filter((line) => !/^\s*#/.test(line))
      const runsOn = code.join('\n').match(/^ {4}runs-on:\s*(\S+)/m)
      const { matrix, problems } = parseMatrix(code)
      const tok = String.raw`(\$\{\{\s*matrix\.\w+\s*\}\}|[\w-]+)`
      const commands = joinContinuations(code)
      // Every `--shard=<i>/N` in the job, on whatever line (a shard on a line without `--project` is checked too).
      const shardRe = new RegExp(String.raw`--shard[=\s]\s*${tok}/(\d+)`)
      const shardUses = commands.flatMap((line) => {
        const found = line.match(shardRe)
        if (!found) return []
        const use = { line: line.trim(), index: found[1], total: Number(found[2]) }
        return [{ ...use, values: expand(use.index, matrix, problems, `"${use.line}"`) }]
      })
      // `--project=<name>` and `--project <name>` both select; one line may select several projects.
      const selections = commands.flatMap((line) => {
        const config = normalizeConfig(line.match(/--config[=\s]\s*(\S+)/)?.[1] ?? MAIN_CONFIG)
        const shardToken = line.match(shardRe)
        const shard = shardToken ? { index: shardToken[1], total: Number(shardToken[2]) } : undefined
        return [...line.matchAll(new RegExp(String.raw`--project[=\s]\s*${tok}`, 'g'))].flatMap((m) =>
          expand(m[1], matrix, problems, `"${line.trim()}"`).map((project) => ({
            line: line.trim(),
            project,
            config,
            noDeps: /--no-deps/.test(line),
            shard,
          })),
        )
      })
      // Artifact names, read per step (a step starts at a `- ` item at the indentation of the step list, so a `- ` line inside a `run: |`
      // or `path: |` block does not split it): the `name:` nested deeper than the step's `uses:` key (the step's own `name:` sits at the
      // same level). null means the upload step has no name (default "artifact").
      const stepsAt = code.findIndex((line) => /^\s+steps:\s*$/.test(line))
      const stepLines = stepsAt === -1 ? [] : code.slice(stepsAt + 1)
      const itemIndent = stepLines.find((line) => /^\s*-\s/.test(line))?.match(/^(\s*)/)[1].length
      const steps = stepLines.reduce((acc, line) => {
        if (/^\s*-\s/.test(line) && line.match(/^(\s*)/)[1].length === itemIndent) acc.push([line])
        else if (acc.length) acc[acc.length - 1].push(line)
        return acc
      }, [])
      const artifactNames = []
      for (const step of steps) {
        const uses = step.find((line) => /uses:\s*actions\/upload-artifact@/.test(line))
        if (!uses) continue
        const keyIndent = uses.indexOf('uses:')
        const nameLine = step.find((line) => !/^\s*-\s/.test(line) && /^\s*name:\s*\S/.test(line) && line.match(/^(\s*)/)[1].length > keyIndent)
        artifactNames.push(nameLine ? nameLine.replace(/^\s*name:\s*/, '').trim() : null)
      }
      const jobName = code.join('\n').match(/^ {4}name:\s*(.+)$/m)?.[1].trim()
      return {
        id,
        name: jobName,
        matrix,
        runsOn: runsOn ? runsOn[1].replace(/^['"]|['"]$/g, '') : undefined,
        isMatrix: Object.keys(matrix).length > 0,
        parseProblems: problems,
        selections,
        shardUses,
        artifactNames,
      }
    })
}

// A name with its `${{ matrix.<key> }}` parts replaced by every combination of the job's values (keys the job does not have stay as written).
function expandName(name, matrix) {
  const keys = [...new Set([...name.matchAll(/\$\{\{\s*matrix\.(\w+)\s*\}\}/g)].map((m) => m[1]))].filter((key) => matrix[key])
  return keys.reduce(
    (names, key) => names.flatMap((n) => matrix[key].map((value) => n.replace(new RegExp(String.raw`\$\{\{\s*matrix\.${key}\s*\}\}`, 'g'), value))),
    [name],
  )
}

// Every rule, as a list of problems (empty when the workflow is fine). `configs` maps a config file to its project names.
function checkWorkflow(workflowText, configs) {
  const problems = []
  const jobs = parseWorkflow(workflowText)
  if (jobs.length < 1) problems.push('no jobs found under `jobs:` in .github/workflows/verify.yml')
  for (const job of jobs) {
    if (!job.runsOn) problems.push(`job "${job.id}" has no \`runs-on:\``)
    for (const p of job.parseProblems) problems.push(`job "${job.id}": ${p}`)
  }
  const selections = jobs.flatMap((job) => job.selections.map((s) => ({ ...s, job })))
  for (const [config, names] of Object.entries(configs)) {
    for (const name of names) {
      const owners = selections.filter((s) => s.config === config && s.project === name).map((s) => s.job.id)
      if (owners.length !== 1) {
        problems.push(
          `project "${name}" is in ${config} but is selected by --project=${name} with ${config} in ${owners.length} jobs (${owners.join(', ') || 'none'}); it must be exactly one`,
        )
      }
    }
  }
  for (const s of selections) {
    if (!configs[s.config]) problems.push(`job "${s.job.id}" runs with --config=${s.config}, which this guard does not know`)
    else if (!configs[s.config].includes(s.project)) problems.push(`job "${s.job.id}" selects --project=${s.project}, which is not a project of ${s.config}`)
  }
  for (const job of jobs) {
    for (const use of job.shardUses) {
      const got = use.values.map(Number)
      const want = Array.from({ length: use.total }, (_, i) => i + 1)
      if (got.length !== want.length || want.some((n) => !got.includes(n)) || new Set(got).size !== got.length) {
        problems.push(`job "${job.id}" shards --shard=<i>/${use.total} over [${got.join(', ')}]; the shards must be exactly 1..${use.total}`)
      }
    }
  }
  for (const job of jobs.filter((j) => j.matrix.shard)) {
    // The total is the number right after the shard placeholder (`${{ matrix.shard }}/N`), not the first `/<digits>` anywhere in the name.
    const nameTotal = job.name?.match(/\$\{\{\s*matrix\.shard\s*\}\}\s*\/\s*(\d+)/)?.[1]
    for (const s of job.selections) {
      if (!s.shard || !/^\$\{\{\s*matrix\.shard\s*\}\}$/.test(s.shard.index)) {
        problems.push(`job "${job.id}" has a shard matrix but "${s.line}" has no --shard=\${{ matrix.shard }}/N; every shard would run the whole suite`)
      } else if (nameTotal && Number(nameTotal) !== s.shard.total) {
        problems.push(`job "${job.id}" is named "${job.name}" but shards over /${s.shard.total}`)
      }
    }
  }
  for (const job of jobs.filter((j) => j.isMatrix)) {
    for (const name of job.artifactNames) {
      if (name === null) {
        problems.push(`matrix job "${job.id}" has an upload-artifact step without \`name:\` (default name "artifact" collides between matrix runs)`)
        continue
      }
      if (!/\$\{\{\s*matrix\./.test(name)) problems.push(`matrix job "${job.id}" uploads an artifact named "${name}" without a \${{ matrix.* }} part; matrix runs would collide on it`)
    }
  }
  // upload-artifact names are unique within one workflow run: expand every matrix part and look for a name that two uploads produce.
  const uploads = new Map()
  for (const job of jobs) {
    for (const name of job.artifactNames.filter((n) => n !== null)) {
      for (const concrete of expandName(name, job.matrix)) uploads.set(concrete, [...(uploads.get(concrete) ?? []), job.id])
    }
  }
  for (const [name, owners] of uploads) {
    if (owners.length > 1) problems.push(`artifact name "${name}" is uploaded ${owners.length} times (${owners.join(', ')}); upload-artifact names must be unique within a run`)
  }
  return problems
}

const configs = {
  [MAIN_CONFIG]: projectNames(read(MAIN_CONFIG)),
  [COMPAT_CONFIG]: projectNames(read(COMPAT_CONFIG)),
}
const workflow = read('.github/workflows/verify.yml')
const lock = JSON.parse(read('package-lock.json'))

test('the Playwright configs have projects', () => {
  assert.ok(configs[MAIN_CONFIG].length >= 1, `projects found in ${MAIN_CONFIG}: none`)
  assert.ok(configs[COMPAT_CONFIG].length >= 1, `projects found in ${COMPAT_CONFIG}: none`)
})

test('every spec in the compat testMatch exists in e2e/', () => {
  const list = /testMatch:\s*\[([^\]]*)\]/.exec(read(COMPAT_CONFIG))
  assert.ok(list, `testMatch not found in ${COMPAT_CONFIG}`)
  const specs = [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  assert.ok(specs.length >= 1, 'testMatch lists no spec')
  for (const spec of specs) assert.ok(fs.existsSync(new URL(`../e2e/${spec}`, import.meta.url)), `${spec} is in the compat testMatch but not in e2e/`)
})

test('verify.yml has jobs, each with a runner', () => {
  const jobs = parseWorkflow(workflow)
  assert.ok(jobs.length >= 1, 'no jobs found under `jobs:` in .github/workflows/verify.yml')
  for (const job of jobs) {
    assert.ok(job.runsOn, `job "${job.id}" in .github/workflows/verify.yml has no \`runs-on:\``)
  }
})

test('every Playwright project is selected in exactly one job, matrix and shards included', () => {
  assert.deepEqual(checkWorkflow(workflow, configs), [])
})

test('Playwright container image tags in verify.yml match @playwright/test in package-lock.json', () => {
  const locked = lock.packages?.['node_modules/@playwright/test']?.version
  assert.ok(locked, 'package-lock.json has no packages["node_modules/@playwright/test"].version')
  const images = [...workflow.matchAll(/mcr\.microsoft\.com\/playwright:v([\w.-]+?)-noble/g)].map((m) => m[1])
  assert.ok(images.length >= 2, `.github/workflows/verify.yml references ${images.length} Playwright container images; expected at least 2 (the compatibility and chromium e2e matrix jobs)`)
  for (const version of images) {
    assert.equal(version, locked, `a Playwright image tag in .github/workflows/verify.yml is v${version} but package-lock.json has @playwright/test ${locked}`)
  }
  for (const [, version] of workflow.matchAll(/IMAGE_TAG_VERSION:\s*([\w.-]+)/g)) {
    assert.equal(version, locked, `IMAGE_TAG_VERSION in .github/workflows/verify.yml is ${version} but package-lock.json has @playwright/test ${locked}`)
  }
})

// Negative cases: small in-memory workflows. `mini` builds the expected shape; each case changes one thing.
const FAKE_CONFIGS = { [MAIN_CONFIG]: ['chromium'], [COMPAT_CONFIG]: ['firefox', 'webkit'] }
const mini = ({
  shards = '[1, 2]',
  projects = '[firefox, webkit]',
  compatRun = 'npx playwright test --config=playwright.compat.config.ts --project=${{ matrix.project }}',
  e2eRun = 'npm run test:e2e -- --project=chromium --shard=${{ matrix.shard }}/2',
  e2eArtifact = 'evidence-chromium-${{ matrix.shard }}',
  e2eName = '',
  e2eTail = '',
  e2eWith = '',
  verifyTail = '',
  compatArtifact = 'compat-evidence-${{ matrix.project }}',
} = {}) => `name: x
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: npm run check
${verifyTail}  e2e-chromium: # note
${e2eName}    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: ${shards}
    steps:
      - run: ${e2eRun}
      - uses: actions/upload-artifact@abc # v7
        with:
${e2eWith}${e2eArtifact === null ? '          path: x' : `          name: ${e2eArtifact}`}
${e2eTail}  compatibility:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        project: ${projects}
    steps:
      - run: ${compatRun}
      - uses: actions/upload-artifact@abc # v7
        with:
          name: ${compatArtifact}
`
const problemsOf = (options) => checkWorkflow(mini(options), FAKE_CONFIGS)
const has = (problems, text) => assert.ok(problems.some((p) => p.includes(text)), `expected a problem containing "${text}", got: ${JSON.stringify(problems)}`)

test('guard: the expected shape has no problems, in flow and block list form', () => {
  assert.deepEqual(problemsOf(), [])
  assert.deepEqual(problemsOf({ shards: '\n          - 1\n          - 2', projects: '\n          - firefox\n          - webkit' }), [])
})

test('guard: a dropped or duplicated shard fails', () => {
  has(problemsOf({ shards: '[1]' }), 'must be exactly 1..2')
  has(problemsOf({ shards: '[1, 1]' }), 'must be exactly 1..2')
  has(problemsOf({ shards: '[1, 2, 3]' }), 'must be exactly 1..2')
})

test('guard: a missing or extra compat project fails', () => {
  has(problemsOf({ projects: '[firefox]' }), 'project "webkit" is in playwright.compat.config.ts')
  has(problemsOf({ projects: '[firefox, webkit, chromium]' }), 'not a project of playwright.compat.config.ts')
  has(problemsOf({ projects: '[firefox, webkit, webkit]' }), 'project "webkit" is in playwright.compat.config.ts')
})

test('guard: the old compat shape (no --project) fails', () => {
  const problems = problemsOf({ compatRun: 'npx playwright test --config=playwright.compat.config.ts --workers=2' })
  has(problems, 'project "firefox" is in playwright.compat.config.ts')
  has(problems, 'project "webkit" is in playwright.compat.config.ts')
})

test('guard: a project selected with the wrong config fails', () => {
  has(problemsOf({ compatRun: 'npx playwright test --project=${{ matrix.project }}' }), 'not a project of playwright.config.ts')
  has(problemsOf({ e2eRun: 'npm run test:e2e -- --config=playwright.compat.config.ts --project=chromium' }), 'not a project of playwright.compat.config.ts')
})

test('guard: a duplicate artifact name in a matrix job fails', () => {
  has(problemsOf({ e2eArtifact: 'evidence-chromium' }), 'without a ${{ matrix.* }} part')
  has(problemsOf({ compatArtifact: 'compat-evidence' }), 'without a ${{ matrix.* }} part')
})

test('guard: a matrix key that is missing or unreadable fails clearly', () => {
  has(problemsOf({ e2eRun: 'npm run test:e2e -- --project=chromium --shard=${{ matrix.part }}/2' }), 'has no key "part"')
  has(problemsOf({ shards: '${{ fromJson(vars.SHARDS) }}' }), 'cannot read the matrix line')
})

test('guard: a shard matrix job must carry --shard, and its name must agree with N', () => {
  has(problemsOf({ e2eRun: 'npm run test:e2e -- --project=chromium' }), 'has no --shard=')
  has(problemsOf({ e2eRun: 'npm run test:e2e -- --project=chromium --shard=1/2' }), 'has no --shard=')
  assert.deepEqual(problemsOf({ e2eName: '    name: e2e (chromium ${{ matrix.shard }}/2)\n' }), [])
  has(problemsOf({ e2eName: '    name: e2e (chromium ${{ matrix.shard }}/3)\n' }), 'but shards over /2')
})

test('guard: backslash-continued lines are read together', () => {
  const run = (rest) => '|\n          npm run test:e2e -- --workers=2 \\\n            --project=chromium \\\n            ' + rest
  assert.deepEqual(problemsOf({ e2eRun: run('--shard=${{ matrix.shard }}/2') }), [])
  has(problemsOf({ e2eRun: run('--shard=${{ matrix.shard }}/2'), shards: '[1]' }), 'must be exactly 1..2')
  has(problemsOf({ e2eRun: run('--workers=2') }), 'has no --shard=')
  assert.deepEqual(problemsOf({ compatRun: '|\n          npx playwright test --config=playwright.compat.config.ts \\\n            --project=${{ matrix.project }}' }), [])
})

test('guard: an upload step without a name cannot borrow a later name', () => {
  has(problemsOf({ e2eArtifact: null }), 'without `name:`')
  has(problemsOf({ e2eArtifact: null, e2eTail: '      - uses: actions/upload-artifact@abc\n        with:\n          name: later-${{ matrix.shard }}\n' }), 'without `name:`')
})

test('guard: a --shard on a line without --project is checked too', () => {
  const extra = '      - run: npx playwright test --shard=1/3\n'
  has(problemsOf({ e2eTail: extra }), 'must be exactly 1..3')
  has(problemsOf({ verifyTail: extra }), 'must be exactly 1..3')
  assert.deepEqual(problemsOf({ e2eTail: '      - run: npx playwright test --shard=${{ matrix.shard }}/2\n' }), [])
})

test('guard: the same artifact name uploaded twice fails, within a job and across jobs', () => {
  const upload = (name) => `      - uses: actions/upload-artifact@abc\n        with:\n          name: ${name}\n`
  has(problemsOf({ e2eTail: upload('evidence-chromium-${{ matrix.shard }}') }), 'is uploaded 2 times')
  has(problemsOf({ verifyTail: upload('evidence-chromium-1') }), 'artifact name "evidence-chromium-1" is uploaded 2 times (verify, e2e-chromium)')
  assert.deepEqual(problemsOf({ verifyTail: upload('verify-evidence') }), [])
})

test('guard: a `- ` line inside a run or path block does not split an upload step', () => {
  assert.deepEqual(problemsOf({ e2eWith: '          path: |\n            - a/**\n            - b\n' }), [])
  has(problemsOf({ e2eWith: '          path: |\n            - a/**\n', e2eArtifact: null }), 'without `name:`')
})

test('guard: the job-name total is the number after the shard placeholder, not the first /<digits>', () => {
  assert.deepEqual(problemsOf({ e2eName: '    name: e2e (v1/2 chromium ${{ matrix.shard }}/2)\n' }), [])
  has(problemsOf({ e2eName: '    name: e2e (v1/2 chromium ${{ matrix.shard }}/3)\n' }), 'but shards over /2')
})

test('guard: a stray trailing backslash does not glue the next key onto its line', () => {
  const run = 'echo x --config=playwright.compat.config.ts \\\n      - run: npm run test:e2e -- --project=chromium --shard=${{ matrix.shard }}/2'
  assert.deepEqual(problemsOf({ e2eRun: run }), [])
})
