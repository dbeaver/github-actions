const core = require('@actions/core');
const github = require('@actions/github');

const asyncFunction = (t) => new Promise(resolve => setTimeout(resolve, t));


const hubspotSearchUssueApi = "https://api.hubapi.com/crm/v3/objects/2-44421436/batch/read?archive=false";
const hubspotUssueUpdateApi ="https://api.hubapi.com/crm/v3/objects/2-44421436/batch/update"

const hubspotAccessToken = core.getInput('hubspotToken');
const githubAccessToken = core.getInput('githubAccessToken');


// const errorMsg = `
//             Each commit message must begin with GitHub or hubspot ticket reference. Like:
//             *  #<issue_number>
//             *  org/repo#<issue_number>
//             *  DB-Number (hubspot)
//             *  CB-Number (hubspot)
//             *  WEB-Number (hubspot)

//             For how to rename your commit message, follow this GitHub Doc:
//             https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/changing-a-commit-message
//           `


async function hs_request(req, data) {

  const response = await fetch(req, {
    method: 'POST',
    body: data,
    headers: {
      'Authorization': `Bearer ${hubspotAccessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const message = `An error has occured: ${response.status} ${response.statusText}`;
    core.setFailed(message);
  }
  const json = await response.json();

  return json;
}

async function main() {

  const context = github.context.payload;
  console.log(context)

  // const token = core.getInput('curRepoToken');
  // const octokit = new github.getOctokit(token);
  // const { data: issue } = await octokit.rest.issues.get({
  //     owner: github.context.payload.organization.login,
  //     repo: github.context.payload.repository.name,
  //     issue_number: github.context.payload.number
  // });

  var searchRequestString = `{"inputs": [{"id": \"${context.issue.html_url}\" }],
                              "idProperty": "issue_url",
                              "properties": ["status", "milestone", "title"]}`;



  const searchResponse = await hs_request(hubspotSearchUssueApi, searchRequestString);
  
  console.log('====================================');
  console.log(searchResponse)
  if ('errors' in searchResponse) {
    console.log("HubSport will not be notifyed:");
    core.warning(searchResponse.errors[0].message);
  }

  if (typeof searchResponse.results !== 'undefined' && searchResponse.results.length > 0) {

    let milestone;
    if (typeof context.issue.milestone == 'undefined') {
      let milestone = 'undefined'
    } else {
      let milestone = context.issue.milestone.title
    }

    var UpdateReqString = `{
      "inputs": [
          {
              "id": \"${searchResponse.results[0].id}\",
              "properties": {
                  "status": \"${context.issue.state}\",
                  "milestone": \"${context.action == 'demilestoned' ? 'demilestoned' : milestone}\",
                  "title": \"${context.issue.title}\"
              }}]}`
    console.log('====================================');
    console.log(UpdateReqString);
    const updateResponse = await hs_request(hubspotUssueUpdateApi, UpdateReqString);
    console.log('====================================');
    console.log(updateResponse);
  }
}

main()