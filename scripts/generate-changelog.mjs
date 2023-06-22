import { spawnSync } from 'node:child_process'

const { GITHUB_TOKEN, FUTURE_TAG, PREVIOUS_TAG, RUN_ID } = process.env

const originRemote = new URL(spawnSync('git', ['remote', 'get-url', 'origin']).stdout.toString())

const [owner, repo] = originRemote.pathname.replace(/\.git$/, '').split('/').splice(1)

const $fetch = async(api, init) => (await fetch(`https://api.github.com${api}`, {
  headers: {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'GitHub-Api-Version': '2022-11-28'
  },
  ...init
})).json()

const previousTagSha = (await $fetch(`/repos/${owner}/${repo}/tags`))
  .filter(tag => tag.name === PREVIOUS_TAG)[0].commit.sha
const commitsMessage = (await $fetch(`/repos/${owner}/${repo}/commits?sha=${previousTagSha}`))
  // filter merge commits and not end with (#number)
  .filter(commit => commit.parents.length === 1
    && commit.commit.message.split('\n')[0].match(/\(#\d+\)$/))
  .map(commit => `* ${commit.commit.message.split('\n')[0]} (@${commit.author.login})`)
  .join('\n')

await $fetch(`/repos/${owner}/${repo}/issues`, {
  method: 'POST',
  body: JSON.stringify({
    title: `[Release Changelogs] ${FUTURE_TAG}`,
    body:
`## Context
🚀 @daebot proposed the following changelogs for release v0.1.0 generated in [workflow run](https://github.com/${owner}/${repo}/actions/runs/${RUN_ID}).
## Changelogs
<!-- BEGIN CHANGELOGS -->
[Full Changelog](https://github.com/${repo}/${repo}/compare/${PREVIOUS_TAG}...${FUTURE_TAG})
${commitsMessage}
`
  })
})
