// import { Octokit } from "@octokit/core";

const core = require('@actions/core');
const github = require('@actions/github');
// const httpCLient =  require('@actions/http-client')

const asyncFunction = (t) => new Promise(resolve => setTimeout(resolve, t));

const commitMsgTemplate = /^#\d+|^[cdweb]+-\d+|^\w+\/\w+-?\w+#\d{1,6}|^Merge/gi;

const jiraUssueApi = "https://dbeaver.atlassian.net/rest/api/2/issue/";
const githubUssueApi = "https://api.github.com/repos/";

const jiraAccessToken = core.getInput('jiraAccessToken');
const githubAccessToken = core.getInput('githubAccessToken');


const errorMsg = `
            Each commit message must begin with GitHub or Jira ticket reference. Like:
            *  #<issue_number>
            *  org/repo#<issue_number>
            *  DB-Number (Jira)
            *  CB-Number (Jira)

            For how to rename your commit message, follow this GitHub Doc:
            https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/changing-a-commit-message
          `


async function requestIssue(ticket) {

  let authToken = githubAccessToken;
  let authMethod = 'Basic'

  if (ticket.board == 'jira') {
    authToken = jiraAccessToken;
    authMethod = 'Basic';
  }


  const response = await fetch(ticket.ticketUri(), {
    method: 'GET',
    headers: {
      'Authorization': `${authMethod} ${Buffer.from(
        authToken
      ).toString('base64')}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    console.error(errorMsg);
    const message = `An error has occured: ${ticket.ticketUri()}: ${response.status} ${response.statusText}`;
    core.setFailed(message);
  }  
  const json = await response.json();

  return json;
}


function msgBelongsTo(msg) {

  if (msg.charAt(0) == "#") {
    let ticketID = msg.match(/^#(\d+)/)[1];
    let board = process.env.GITHUB_REPOSITORY;
    return new Ticket(board, ticketID);
  
  } else if (msg.substring(0, 2).toLowerCase() == "cb") {
    let ticketMeta = msg.match(/^[A-Z]+-\d{1,6}/);
    return new Ticket('jira', ticketMeta[0]);

  } else if (/^\w+\/\w+-?\w+#\d{1,6}/.test(msg)) {
    let ticketMeta = msg.match(/^(\w+\/\w+-?\w+)#(\d{1,6})/);
    // ticketMeta[1] = board
    // ticketMeta[2] = ticket ID
    return new Ticket(ticketMeta[1], ticketMeta[2])
  }
  return 'Unknown repo';
}


class Ticket {
  constructor(board, ID) {
    this.board = board;
    this.ID = ID;
    this.status = null
  }

  ticketUri() {
    if (this.board == 'jira') {
      return jiraUssueApi + this.ID;
    }
    return githubUssueApi + this.board + '/issues/' + this.ID;
  }

  async setStatus() {
    const status = await requestIssue(this);
    if (this.board == 'jira') {
      this.status = status.fields.status.name;
    } else {
      this.status = status.state;
    }
  }

  getStatus() {
    return this.status;
  }
}

async function main() {
  var ticket;
  const rejectedStatuses = ['closed', 'done'];

  const token = core.getInput('curRepoToken');
  const octokit = new github.getOctokit(token);
  const { data: listCommits } = await octokit.rest.pulls.listCommits({
      owner: github.context.payload.organization.login,
      repo: github.context.payload.repository.name,
      pull_number: github.context.payload.number
  });
  const lastCommit = listCommits.slice(-1);
  console.log(lastCommit[0].commit.message);
  const lastCommitMessage = lastCommit[0].commit.message;
  
  if (!lastCommitMessage) {
    core.setFailed('Empty commit message.');
  }

  const patterns = lastCommitMessage.match(commitMsgTemplate);
  console.log(patterns)
  
  if (patterns === null) { 
    console.error(errorMsg);
    core.setFailed('Commit message validation failed.');
    process.exit(1);
  }

  if (patterns[0] === 'Merge') {
    process.exit(0);
  } else if (patterns[0]) {
    ticket = msgBelongsTo(patterns[0]);
  } else {
    console.error(errorMsg);
    core.setFailed('Commit message validation failed.');
  }
  if (ticket) {
    await ticket.setStatus();
    console.log('Ticket status: ' + ticket.status)
  }
  if (ticket) {
    if (rejectedStatuses.includes(ticket.status)) {
      const closedMessage = `Ticket ${ticket.board} ${ticket.ID} has status: ${ticket.status}.`;
      throw new Error(closedMessage);
    } else {
      console.log("All fine")
    }
  }
}

main()