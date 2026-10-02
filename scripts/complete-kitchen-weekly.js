/* Trusted main-branch code: never execute the data PR's files. */
module.exports = async function completeKitchenWeekly({github, context, core, schema, now}) {
  const owner='pauljsnider', repo='paulsnidernet';
  const run=context.payload.workflow_run;
  if (!run || run.name!=='Kitchen validation' || run.conclusion!=='success' || run.event!=='pull_request' ||
      run.actor.login!==owner || run.head_repository.full_name!==owner+'/'+repo ||
      !/^kitchen-weekly\/\d{4}-\d{2}-\d{2}$/.test(run.head_branch)) return;
  const prs=await github.rest.pulls.list({owner,repo,state:'open',head:owner+':'+run.head_branch,base:'main'});
  if(prs.data.length!==1)return;
  const pr=(await github.rest.pulls.get({owner,repo,pull_number:prs.data[0].number})).data;
  if(pr.user.login!==owner || pr.head.repo.full_name!==owner+'/'+repo || pr.head.sha!==run.head_sha || pr.draft ||
      pr.base.ref!=='main' || pr.base.repo.full_name!==owner+'/'+repo || !run.pull_requests.some(p=>p.number===pr.number))return;
  const files=(await github.rest.pulls.listFiles({owner,repo,pull_number:pr.number,per_page:100})).data;
  if(pr.changed_files!==1 || files.length!==1 || files[0].filename!=='family/kitchen-weekly.json' ||
      !['added','modified'].includes(files[0].status))throw Error('Data-only boundary failed');
  const response=await github.rest.repos.getContent({owner,repo,path:'family/kitchen-weekly.json',ref:pr.head.sha});
  if(response.data.type!=='file' || response.data.size>32768 || response.data.encoding!=='base64')throw Error('Unexpected payload');
  const feed=JSON.parse(Buffer.from(response.data.content,'base64').toString('utf8'));
  if(!schema.validate(feed) || Date.parse(feed.generated_at)>now+300000 || Date.parse(feed.expires_at)<=now ||
      run.head_branch!=='kitchen-weekly/'+feed.week_start)throw Error('Policy/schema/freshness failed');
  const checks=(await github.rest.checks.listForRef({owner,repo,ref:pr.head.sha,per_page:100})).data;
  const statuses=(await github.rest.repos.getCombinedStatusForRef({owner,repo,ref:pr.head.sha})).data;
  if(checks.total_count!==checks.check_runs.length || !checks.check_runs.some(r=>r.name==='kitchen-validation' &&
      r.app.slug==='github-actions' && r.status==='completed' && r.conclusion==='success' &&
      r.details_url.startsWith('https://github.com/'+owner+'/'+repo+'/actions/runs/'+run.id+'/')) ||
      !checks.check_runs.every(r=>r.status==='completed'&&['success','skipped','neutral'].includes(r.conclusion)) ||
      statuses.total_count!==statuses.statuses.length || (statuses.total_count>0&&statuses.state!=='success'))throw Error('Checks incomplete or failed');
  const current=(await github.rest.pulls.get({owner,repo,pull_number:pr.number})).data;
  if(current.head.sha!==pr.head.sha || current.state!=='open' || current.base.ref!=='main')throw Error('PR changed before merge');
  const merged=await github.rest.pulls.merge({owner,repo,pull_number:pr.number,sha:pr.head.sha,merge_method:'squash'});
  if(!merged.data.merged)throw Error('Exact-SHA merge refused');
  // GITHUB_TOKEN merges do not trigger another workflow/Pages build automatically.
  await github.request('POST /repos/{owner}/{repo}/pages/builds',{owner,repo});
  core.notice('Approved weekly data merged; Pages build requested.');
};
