const core = require('@actions/core');
const github = require('@actions/github');

const asyncFunction = (t) => new Promise(resolve => setTimeout(resolve, t));


const hubspotUssueApi = "https://api.hubapi.com/crm/v3/objects/2-44421436/batch/read?archive=false";

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

  let authToken = githubAccessToken;
  let authMethod = 'Bearer'

  const response = await fetch(req, {
    method: 'POST',
    body: data,
    headers: {
      'Authorization': `${authMethod} ${Buffer.from(
        authToken
      ).toString('base64')}`,
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

  // const token = core.getInput('curRepoToken');
  // const octokit = new github.getOctokit(token);
  // const { data: issue } = await octokit.rest.issues.get({
  //     owner: github.context.payload.organization.login,
  //     repo: github.context.payload.repository.name,
  //     issue_number: github.context.payload.number
  // });

  var searchRequestString = `{"inputs": [{ "id": \"${context.issue.url}\" }]}`;
  console.log(searchRequestString);
  const searchRequestJson = JSON.parse(searchRequestString);
  console.log(searchRequestJson);
  const hs_search_request = await hs_request(hubspotUssueApi, searchRequestJson);
  console.log(hs_search_request)
}

main()